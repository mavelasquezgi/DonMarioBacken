import { Request, Response, NextFunction } from 'express'; // Added NextFunction
import Mark from '../models/mark';
import { ascendentObjCompare } from '../helpers/helpers'; // Assuming this helper is robust
import logger from '../helpers/winstonLogger'; // Keeping the original import path

// Custom Error class for consistent error handling.
// (Can be moved to a shared utility file if reused across controllers)
class CustomError extends Error {
    status?: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'CustomError';
        this.status = status;
    }
}

export async function createMark(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const name = req.body.name?.toUpperCase();
        const image = req.file?.filename;

        if (!name) {
            logger.warn('Missing name for creating a new mark.', { body: req.body });
            return res.status(400).json({ message: 'Mark name is required.' });
        }

        const NEWREGISTER = { name, image };
        const mark = new Mark(NEWREGISTER);

        const RESULTSEARCH = await Mark.find({ name });
        if (RESULTSEARCH.length !== 0) {
            const message = `A mark with the name "${name}" already exists.`;
            logger.warn(message, { markName: name });
            return res.status(400).json({ message });
        } else {
            await mark.save();
            logger.info(`Mark "${name}" created successfully. ID: ${mark._id}`);
            return res.status(200).json({ success: `Marca ${name} creada` });
        }
    } catch (error: any) {
        logger.error(`Error creating mark: ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error creating the mark.', 500));
    }
}

export async function updateMark(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const { id, name, priority } = req.body;
        const image = req.file?.filename;

        if (!id || !name) {
            logger.warn('Missing ID or name for updating a mark.', { body: req.body });
            return res.status(400).json({ message: 'Mark ID and name are required for update.' });
        }

        const NEWREGISTER: any = { name: name.toUpperCase(), priority };
        if (image) {
            NEWREGISTER.image = image;
            logger.info(`New image uploaded for mark ID: ${id}.`);
        }

        const RESULTSEARCH = await Mark.findById(id); // Use findById for direct ID lookup
        if (!RESULTSEARCH) {
            const message = `No mark found with ID "${id}".`;
            logger.warn(message, { markId: id });
            return res.status(400).json({ message });
        } else {
            await Mark.findByIdAndUpdate(id, { $set: NEWREGISTER });
            logger.info(`Mark "${name}" (ID: ${id}) updated successfully.`);
            // Original message said "creada" (created), corrected to "actualizada" (updated)
            return res.status(200).json({ success: `Marca ${name} actualizada` });
        }
    } catch (error: any) {
        logger.error(`Error updating mark (ID: ${req.body.id}): ${error.message}`, { stack: error.stack, details: error, body: req.body });
        next(new CustomError('Error updating the mark.', 500));
    }
}

export async function deleteMark(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const user: any = req.user; // Assuming req.user is populated by passport
        const { id, name, deleted } = req.body; // Destructure for clarity and logging

        if (!id) {
            logger.warn('Missing mark ID for deletion status update.', { body: req.body });
            return res.status(400).json({ message: 'Mark ID is required for deletion.' });
        }

        if (!user || user.role !== "Admin") {
            logger.warn(`Unauthorized attempt to change deletion status for mark ID: ${id} by user ID: ${user?.id || 'N/A'}`);
            return res.status(403).send({ message: `Unauthorized user.` }); // Changed from 400 to 403 for authorization
        }

        const updatedMark = await Mark.findByIdAndUpdate(id, { $set: { deleted: !deleted } }, { new: true });

        if (!updatedMark) {
            logger.warn(`Mark with ID "${id}" not found for deletion status update.`);
            return res.status(404).send({ message: `Mark with ID "${id}" not found.` });
        }

        logger.info(`Mark "${updatedMark.name}" (ID: ${updatedMark._id}) deletion status toggled to: ${updatedMark.deleted}`);
        return res.status(200).send({ success: `Marca eliminada: ${updatedMark.name}, nuevo estado: ${updatedMark.deleted}` });
    } catch (error: any) {
        logger.error(`Error deleting mark (ID: ${req.body.id}): ${error.message}`, { stack: error.stack, details: error, body: req.body });
        // Original message had typo 'marca: ${req.body.name}}', corrected
        next(new CustomError(`Error deleting mark: ${req.body.name || 'N/A'}.`, 500));
    }
}

export async function marksNames(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const RESULT: any[] = await Mark.find({ deleted: false }, { _id: 0, name: 1 }).sort({ name: 1 });
        const listNames: string[] = RESULT.map((element: any) => element.name);

        logger.info('Mark names retrieved successfully.');
        return res.status(200).json(listNames.sort()); // Assuming simple string sort is intended
    } catch (error: any) {
        logger.error(`Error retrieving mark names: ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving mark names.', 500));
    }
}

export async function marks(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const RESULT: any[] = await Mark.find({}).sort({ name: 1 });
        logger.info('All marks retrieved successfully.');
        // Ensure ascendentObjCompare is robust for potentially complex objects.
        return res.status(200).json(RESULT.sort(ascendentObjCompare("name")));
    } catch (error: any) {
        logger.error(`Error retrieving all marks: ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving all marks.', 500));
    }
}

export async function marksWithLimit(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
        const limit = parseInt(req.params.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            logger.warn(`Invalid limit provided for marksWithLimit: ${req.params.limit}`);
            return res.status(400).json({ message: 'Limit must be a positive number.' });
        }
        const RESULT: any[] = await Mark.find({}).sort({ priority: -1 }).limit(limit);
        logger.info(`Limited marks (${limit}) retrieved successfully.`);
        return res.status(200).json(RESULT.sort(ascendentObjCompare("priority")));
    } catch (error: any) {
        logger.error(`Error retrieving limited marks (${req.params.limit}): ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving limited marks.', 500));
    }
}