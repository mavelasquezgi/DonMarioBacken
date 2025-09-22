import { Request, Response } from 'express';
import User from '../models/user';
import { createToken, verifyToken } from '../helpers/jwt_helpers';
import { matchPassword, encryptPassword } from '../helpers/helpers';
import { sendEmailValidation } from '../helpers/nodemailer.helpers';
import { TokenPayload } from '../models/payloadJwt.dto';
import logger from '../helpers/winstonLogger'; // Ensure this import path is correct
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import { UserRole } from '../models/role';

async function validStrField(field: string): Promise<boolean> {
    const errors: string[] = ["find", "select", "drop", "update", "href", "delete", "src"];
    for (const err of errors) {
        if (field.toLowerCase().includes(err)) { // Using .includes() is cleaner
            logger.warn(`ValidStrField: Invalid string detected in field: '${field}', disallowed word: '${err}'`);
            return false;
        }
    }
    return true;
}

const generateAuthToken = async ({ 
    _id, role, names, lastnames, businessRegistrationNumber // Desestructuración directa para simplificar el mantenimiento
}: {
    _id: string;
    role: UserRole;
    names: string;
    lastnames: string;
    businessRegistrationNumber?: string;
}, expiresIn: number): Promise<string> => {
    // 1. Construye el Payload del token
    const payload: TokenPayload = {
        id: _id.toString(), 
        role,               
        username: `${names} ${lastnames}`, 
        businessRegistrationNumber
    };
    
    // 2. Llama a la función de creación/firma del JWT (asumiendo que está importada)
    return await createToken(payload, expiresIn)as string;
};

export const signUp = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Attempting user signup.');
    console.log('Signup request body:', req.body); // Debugging line to inspect request body

    const { tokenbyaccesss } = req.headers;
    if (!tokenbyaccesss) {
        logger.warn('Signup failed: No access token provided.');
        return res.status(401).send({ message: 'No autorizado: Token no enviado' });
    }

    let validateToken: any;
    try {
        validateToken = await verifyToken(tokenbyaccesss as string);
        
        if (!validateToken || 'message' in validateToken || validateToken.username !== "Amas" || validateToken.password !== "QW1hc3MqQWRtaW4=") {
            logger.warn('Signup failed: Invalid access token credentials or expired/invalid token.');
            return res.status(403).send({ message: 'Acceso denegado: Credenciales de token inválidas.' });
        }
    } catch (tokenError: any) {
        logger.error(`Signup failed: Error verifying access token: ${tokenError.message}`, tokenError);
        return res.status(401).send({ message: 'No autorizado: Token inválido' });
    }

    try {
        const {
            documentType, document, names, lastnames, email, password, phone, city, department, address,
            gender, verification, role, businessName, businessRegistrationNumber, ranking, commissionPercentage
        } = req.body;

        if (!Object.values(UserRole).includes(role)) {
            logger.warn(`Signup failed: Invalid role provided: '${role}'.`);
            return res.status(400).send({ message: `El rol '${role}' para el usuario no existe` });
        }

        const validNamesField = await validStrField(names);
        const validLastnamesField = await validStrField(lastnames);
        if (!validNamesField || !validLastnamesField) {
            logger.warn('Signup failed: Invalid characters in names or lastnames.');
            return res.status(400).send({ message: 'El campo de los nombres o apellidos tienen caracteres no válidos' });
        }

        const existentUser = await User.findOne({
            $or: [
                { email: email },
                { document: document },
                ...(businessRegistrationNumber && (role === UserRole.STORE || role === UserRole.SUPPLIER) ? [{ businessRegistrationNumber: businessRegistrationNumber }] : [])
            ]
        });

        if (existentUser) {
            if (existentUser.email === email) {
                return res.status(409).send({ message: `El email '${email}' ya posee una cuenta` });
            }
            if (existentUser.document === document) {
                return res.status(409).send({ message: `El documento '${document}' ya está registrado` });
            }
            if (existentUser.businessRegistrationNumber === businessRegistrationNumber) {
                return res.status(409).send({ message: `El número de registro de empresa ya existe.` });
            }
        }

        let newUser: any = {
            documentType,
            document,
            names,
            lastnames,
            email,
            password: await encryptPassword(password.toString()),
            phone,
            city,
            department,
            address,
            gender,
            verification: verification || false,
            role,
        };

        if (role === UserRole.SELLER) {
            newUser = { ...newUser, ranking, commissionPercentage };
        } else if (role === UserRole.STORE || role === UserRole.SUPPLIER) {
            newUser = { ...newUser, businessName, businessRegistrationNumber };
        }

        const user = new User(newUser);
        await user.save();
        logger.info(`User '${user.email}' created successfully.`);

        if (!user.verification) {
            const expiresIn = 3 * 60 * 60; // 3 horas para el token de verificación
            
            // ✅ Uso de la función interna refactorizada
            console.log('Generating verification token for user:', user);
            const verificationToken = await generateAuthToken(user, expiresIn);

            const sendEmailResult = await sendEmailValidation(req.headers.origin as string, verificationToken, user.email, `${user.names} ${user.lastnames}`);
            if (sendEmailResult) {
                logger.info(`Verification email sent successfully to '${user.email}'.`);
                return res.status(200).send({ message: 'Usuario creado. Email de verificación enviado.' });
            } else {user
                logger.error(`Failed to send verification email to '${user.email}'.`);
                return res.status(500).send({ message: 'Error enviando el email de verificación.' });
            }
        } else {
            return res.status(201).send({ message: 'Usuario creado y verificado exitosamente.' });
        }
    } catch (e: any) {
        logger.error(`Signup failed for email '${req.body.email}': ${e.message}`, e);
        if (e.code === 11000) {
            return res.status(409).send({ message: 'Ya existe un usuario con este documento, email o número de registro de empresa.' });
        }
        if (e.name === 'ValidationError') {
            return res.status(400).send({ message: `Error de validación: ${e.message}` });
        }
        return res.status(500).send({ message: 'Error interno del servidor al crear el usuario.' });
    }
};


export const signIn = async (req: Request, res: Response): Promise<Response> => {
    logger.info(`Attempting user sign-in for email: ${req.body.email}`);
    const { email, password } = req.body;

    if (!email || !password) {
        logger.warn('Sign-in failed: Email and password are required.');
        return res.status(400).send({ message: 'Correo y contraseña son requeridos' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || user.deleted) { 
            logger.warn(`Sign-in failed for email '${email}': User does not exist or is deleted.`);
            return res.status(401).send({ message: 'El usuario no existe o ha sido deshabilitado' });
        }

        const isMatch = await matchPassword(password, user.password);
        if (!isMatch) {
            logger.warn(`Sign-in failed for email '${email}': Incorrect password.`);
            return res.status(401).send({ message: 'Contraseña incorrecta' });
        }

        if (!user.verification) {
            logger.warn(`Sign-in failed for email '${email}': User account not verified.`);
            return res.status(401).json({ message: 'Usuario no verificado. Por favor, verifique su correo electrónico.' });
        }

        const expiresIn = 7 * 24 * 60 * 60; // 7 días para el Access Token
        
        // ✅ Uso de la función interna refactorizada
        console.log('Generating verification token for user:', user);
        const accessToken = await generateAuthToken(user, expiresIn);

        const userResponse = {
            id: user._id,
            fullname: `${user.names} ${user.lastnames}`,
            role: user.role,
            token: accessToken,
            expiresIn: expiresIn
        };
        logger.info(`User '${email}' signed in successfully.`);
        return res.status(200).json(userResponse);
    } catch (error: any) {
        logger.error(`Error during sign-in for email '${req.body.email}': ${error.message}`, error);
        return res.status(500).send({ message: 'Error interno del servidor durante el inicio de sesión.' });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<Response> => {
    const requestUser: any = req.user;

    // 1. Autorización: Permite al ADMIN o STORE (Vendedor/Tienda) realizar la actualización
    const allowedRoles = [UserRole.ADMIN, UserRole.STORE]; // Asumiendo que 'Vendedor' es UserRole.STORE
    if (!requestUser || !allowedRoles.includes(requestUser.role)) { 
        logger.warn(`Update user failed: Unauthorized attempt by user with role '${requestUser?.role}'.`);
        return res.status(403).send({ message: "Usuario No autorizado, solo permitido para roles Admin o Vendedor/Tienda" });
    }

    console.log('Update user request body:', req.body); // Debugging line to inspect request body
    const { id, ...updateFields } = req.body; // Captura el ID y el resto de campos (incluidos todos los opcionales)

    // 2. Validación de ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Update user failed: Invalid or missing user ID for update: ${id}`);
        return res.status(400).send({ message: 'ID de usuario inválido o no proporcionado.' });
    }

    try {
        const findCustomer = await User.findById(id);
        if (!findCustomer) {
            logger.warn(`Update user failed: User with ID ${id} not found.`);
            return res.status(404).send({ message: `No existe el usuario con ID: ${id}` });
        }
        
        // 3. Objeto de Actualización (Contiene todos los campos que se enviaron)
        const updatedUserData: Record<string, any> = updateFields;
        
        // 4. Validación de Unicidad de Email (si se proporciona)
        if (updatedUserData.email && updatedUserData.email !== findCustomer.email) {
            const emailExists = await User.findOne({ email: updatedUserData.email, _id: { $ne: id } });
            if (emailExists) {
                return res.status(409).send({ message: `El email '${updatedUserData.email}' ya está en uso por otro usuario.` });
            }
        }
        
        // 6. Validación de Caracteres de Nombres/Apellidos (si se proporcionan)
        if (updatedUserData.names) {
            if (!(await validStrField(updatedUserData.names))) {
                logger.warn(`Update user failed: Invalid characters in names for user ID: ${id}.`);
                return res.status(400).send({ message: `El campo de nombres tiene caracteres no válidos` });
            }
        }
        
        if (updatedUserData.lastnames) {
            if (!(await validStrField(updatedUserData.lastnames))) {
                logger.warn(`Update user failed: Invalid characters in lastnames for user ID: ${id}.`);
                return res.status(400).send({ message: `El campo de apellidos tiene caracteres no válidos` });
            }
        }

        // 7. Ejecución de la Actualización: Se aplica $set a todos los campos enviados.
        const updatedUser = await User.findByIdAndUpdate(id, { $set: updatedUserData }, { 
            new: true,
            runValidators: true // Aplica validadores de Mongoose (esencial para rangos numéricos y tipos)
        });
        
        // 8. Respuesta
        if (updatedUser) {
            logger.info(`User ID ${id} updated successfully by admin/store.`);
            return res.status(200).send({ success: `Usuario actualizado: ${updatedUser.names} ${updatedUser.lastnames}` });
        } else {
            logger.warn(`Update user failed: User with ID ${id} not found for update.`);
            return res.status(404).send({ message: `No se encontró el usuario para actualizar.` });
        }

    } catch (err: any) {
        // ... Manejo de errores 
        logger.error(`Error updating user ID ${req.body.id}: ${err.message}`, err);
        if (err.code === 11000) {
            return res.status(409).send({ message: `El documento, email o número de registro proporcionado ya existe para otro usuario.` });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).send({ message: `Error de validación al actualizar el usuario: ${err.message}` });
        }
        return res.status(500).send({ message: `Error interno del servidor al actualizar el usuario.` });
    }
};

// Las otras funciones (tokenNotLogin, confirmation, changePassword, etc.) no requieren cambios significativos ya que se basan en lógica de autenticación genérica y no en los campos específicos del modelo. Se pueden mantener como están, pero asegúrate de que el middleware de autenticación que usa `req.user.role` esté usando el `UserRole` en lugar del `Role` si fuera el caso.


export const listUsers = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Fetching list of all users.');
    try {
        const users = await User.find({ deleted: false }).sort({ names: 1 }); // Solo listar usuarios no borrados
        logger.info(`Successfully retrieved ${users.length} users.`);
        return res.status(200).send(users);
    } catch (error: any) {
        logger.error(`Error fetching list of users: ${error.message}`, error);
        return res.status(500).json({ message: 'Error interno del servidor al listar usuarios.' });
    }
};

export const listUsersProject = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Fetching list of users with projected fields.');
    try {
        const users = await User.find({ deleted: false }, { // Solo listar usuarios no borrados
            names: 1,
            lastnames: 1,
            document: 1,
            phone: 1,
            address: 1,
            city: 1,
            department: 1,
            email: 1,
            role: 1, // Añadir el rol para diferenciar
            ranking: 1, // Añadir el ranking
            businessName: 1 // Añadir el nombre de negocio
        }).sort({ names: 1 });
        logger.info(`Successfully retrieved ${users.length} users with projected fields.`);
        return res.status(200).send(users);
    } catch (error: any) {
        logger.error(`Error fetching users with projected fields: ${error.message}`, error);
        return res.status(500).json({ message: 'Error interno del servidor al listar usuarios con proyección.' });
    }
};

export const usersByFilterProject = async (req: Request, res: Response): Promise<Response> => {
    logger.info(`Fetching users by filter with projection. Filters: ${JSON.stringify(req.body)}`);
    try {
        const filters = req.body;
        // Solo buscar usuarios no borrados
        const users = await User.find({ ...filters, deleted: false }, { 
            names: 1,
            lastnames: 1,
            document: 1,
            phone: 1,
            address: 1,
            city: 1,
            department: 1,
            email: 1,
            role: 1,
            ranking: 1,
            businessName: 1
        }).sort({ names: 1 });

        if (users) {
            logger.info(`Users found by filter: ${users.length}`);
        } else {
            logger.info(`No user found matching filters: ${JSON.stringify(filters)}`);
        }
        return res.status(200).json(users);
    } catch (error: any) {
        logger.error(`Error fetching users by filter: ${error.message}`, error);
        return res.status(500).json({ message: "Error interno del servidor al buscar usuarios por filtro." });
    }
};

export const tokenNotLogin = async (req: Request, res: Response): Promise<Response> => {
    logger.info('Attempting to generate access token for non-login (Amas) context.');
    const { username, password, action } = req.body;

    if (username === "Amas" && password === "QW1hc3MqQWRtaW4=" && action === "token") {
        const body: TokenPayload = { id: "Amas", role: 'token', username, password, action };
        const expiresIn = 900; // 15 minutes
        const accessToken = await createToken(body, expiresIn);
        logger.info('Access token generated successfully for Amas context.');
        return res.status(200).send({ accessToken, expiresIn });
    } else {
        logger.warn('Token generation failed: Invalid credentials or action for non-login context.');
        return res.status(400).send({ message: 'Validación fallida: Credenciales o acción incorrectas.' });
    }
};

export const confirmation = async (req: Request, res: Response): Promise<Response> => {
    logger.info(`Attempting to confirm user account with token: ${req.params.token ? 'Provided' : 'Not Provided'}`);
    if (!req.params.token) {
        logger.warn('Account confirmation failed: No token provided in parameters.');
        return res.status(400).send({ message: 'Cuenta no verificada: Token no proporcionado.' });
    }

    let tokenPayload: any;
    try {
        tokenPayload = await verifyToken(req.params.token);
        logger.debug(`Confirmation: Token verification result: ${JSON.stringify(tokenPayload)}`);
    } catch (verifyError: any) {
        logger.error(`Confirmation failed: Error verifying token: ${verifyError.message}`, verifyError);
        return res.status(400).send({ message: 'Cuenta no verificada: Token inválido.' });
    }

    if (!tokenPayload || !tokenPayload.id) { // Check if token is invalid or missing ID
        logger.warn(`Confirmation failed: Token is null or missing user ID. Token data: ${JSON.stringify(tokenPayload)}`);
        return res.status(400).send({ message: 'Cuenta no verificada: Token no válido o ID de usuario faltante.' });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(tokenPayload.id)) {
            logger.warn(`Confirmation failed: Invalid ObjectId in token payload: ${tokenPayload.id}`);
            return res.status(400).send({ message: 'Cuenta no verificada: ID de usuario inválido en el token.' });
        }

        const updatedUser = await User.findByIdAndUpdate(tokenPayload.id, { $set: { verification: true } }, { new: true });

        if (updatedUser) {
            logger.info(`Account for user ID ${tokenPayload.id} confirmed successfully.`);
            return res.status(200).send({ success: 'La cuenta se ha verificado exitosamente, ya puede ingresar con su correo y contraseña.' });
        } else {
            logger.warn(`Confirmation failed: User with ID ${tokenPayload.id} not found for update.`);
            return res.status(404).send({ message: 'Cuenta no verificada: Usuario no encontrado.' });
        }
    } catch (error: any) {
        logger.error(`Error confirming account for user ID ${tokenPayload.id}: ${error.message}`, error);
        return res.status(500).send({ message: 'Cuenta no verificada: Error interno del servidor. Contactese con el área de TI para resolverlo.' });
    }
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
    logger.info(`Attempting to change password for user.`);
    const { currentPassword, newPassword } = req.body;
    const requestUser: any = req.user; // Assuming req.user is populated by auth middleware

    if (!requestUser || !requestUser._id) {
        logger.warn('Change password failed: User not authenticated.');
        return res.status(401).send({ message: 'Usuario no autenticado.' }); // 401 Unauthorized
    }

    try {
        // Fetch the user from the database to ensure we have the latest password hash
        const userInDb = await User.findById(requestUser._id);
        if (!userInDb) {
            logger.error(`Change password failed: Authenticated user ID ${requestUser._id} not found in DB.`);
            return res.status(404).send({ message: 'Usuario no encontrado.' }); // Should ideally not happen if auth middleware is robust
        }

        const validPassword = await matchPassword(currentPassword, userInDb.password);
        if (!validPassword) {
            logger.warn(`Change password failed for user ${userInDb.email}: Current password mismatch.`);
            return res.status(400).send({ message: 'La contraseña actual es incorrecta.' }); // Specific error message
        }

        const hashedNewPassword = await encryptPassword(newPassword);
        await User.updateOne({ _id: userInDb._id }, { $set: { password: hashedNewPassword } }); // Use _id for update
        logger.info(`Password updated successfully for user ID: ${userInDb._id}`);
        return res.status(200).send({ success: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
        logger.error(`Error changing password for user ID ${requestUser._id}: ${error.message}`, error);
        return res.status(500).send({ message: 'Error interno del servidor al cambiar la contraseña.' });
    }
};

export const userById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    logger.info(`Fetching user by ID: ${id}`);
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`User by ID: Invalid ID format provided: ${id}`);
            return res.status(400).send({ message: 'ID de usuario inválido.' });
        }
        const user = await User.findById(id); // findById is more direct than findOne({_id: id})

        if (!user) {
            logger.info(`User with ID ${id} not found.`);
            return res.status(404).send({ message: `No se encuentra el usuario: ${id}` });
        }
        logger.info(`User with ID ${id} found successfully.`);
        return res.status(200).send(user);
    } catch (error: any) {
        logger.error(`Error fetching user by ID ${id}: ${error.message}`, error);
        return res.status(500).send({ message: `Error interno del servidor al buscar el usuario.` });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
    const requestUser: any = req.user; // Authenticated user
    logger.info(`Attempting to change 'deleted' status for user ID: ${req.body.id} by user: ${requestUser?.email || 'N/A'}`);

    if (!requestUser || requestUser.role !== "Admin") {
        logger.warn(`Delete user failed: Unauthorized attempt by user with role '${requestUser?.role || 'N/A'}'.`);
        return res.status(403).send({ message: `Usuario no autorizado para realizar esta acción.` }); // 403 Forbidden
    }

    const { id, deleted } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Delete user failed: Invalid or missing user ID for delete/restore operation: ${id}`);
        return res.status(400).send({ message: `ID de usuario inválido o no proporcionado.` });
    }
    if (typeof deleted !== 'boolean') {
        logger.warn(`Delete user failed: Invalid 'deleted' status provided for user ID ${id}: ${deleted}`);
        return res.status(400).send({ message: `El estado 'deleted' es requerido y debe ser un valor booleano (true/false).` });
    }

    try {
        // Find and update, returning the new document
        const updatedUser = await User.findByIdAndUpdate({ _id: id }, { $set: { deleted: deleted } }, { new: true });

        if (updatedUser) {
            logger.info(`User ${id} 'deleted' status updated to ${deleted} successfully. User name: ${updatedUser.names} ${updatedUser.lastnames}.`);
            return res.status(200).send({ success: `Estado de usuario actualizado: ${updatedUser.names} ${updatedUser.lastnames}`, newStatus: updatedUser.deleted });
        } else {
            logger.warn(`Delete user failed: User with ID ${id} not found for update.`);
            return res.status(404).send({ message: `Usuario con ID ${id} no encontrado.` }); // 404 Not Found
        }
    } catch (err: any) {
        logger.error(`Error updating 'deleted' status for user ID ${id}: ${err.message}`, err);
        return res.status(500).send({ message: `Error interno del servidor al actualizar el usuario.` });
    }
};