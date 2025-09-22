import { Request, Response, NextFunction } from 'express'; // Added NextFunction
import Town from '../models/towns';
import logger from '../helpers/winstonLogger'; // Keeping the original import path

// Custom Error class for consistent error handling, can be moved to a helpers/errors.ts
class CustomError extends Error {
    status?: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'CustomError';
        this.status = status;
    }
}

export const countryStates = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const country = req.params.country;
        if (!country) {
            logger.warn('Missing country parameter in countryStates request.');
            return res.status(400).json({ message: 'Country parameter is required.' });
        }

        const towns = await Town.find({ country });
        const states: string[] = towns.map(file => file.state); // Use map for cleaner array transformation
        
        logger.info(`States for country '${country}' retrieved successfully.`);
        return res.status(200).send(states.sort());
    } catch (error: any) {
        logger.error(`Error in countryStates for country '${req.params.country}': ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving country states.', 500));
    }
};

export const stateCities = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { country, state } = req.params;
        if (!country || !state) {
            logger.warn('Missing country or state parameter in stateCities request.');
            return res.status(400).json({ message: 'Country and state parameters are required.' });
        }

        const town = await Town.findOne({ country, state });
        const cities: string[] = town ? town.cities : [];
        
        logger.info(`Cities for state '${state}' in country '${country}' retrieved successfully.`);
        return res.status(200).send(cities.sort());
    } catch (error: any) {
        logger.error(`Error in stateCities for country '${req.params.country}', state '${req.params.state}': ${error.message}`, { stack: error.stack, details: error });
        next(new CustomError('Error retrieving state cities.', 500));
    }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { id, state, country, cities } = req.body; // Destructure directly
        
        // Basic input validation
        if (!id || !state || !country || !Array.isArray(cities) || cities.length === 0) {
            logger.warn('Missing or invalid data for creating department.', { body: req.body });
            return res.status(400).json({ message: 'All fields (id, state, country, cities) are required and cities must be an array.' });
        }

        const newTownData = { id, state, country, cities };
        const town = new Town(newTownData);

        const resultSearch = await Town.find({ state }); // Check by state

        if (resultSearch.length !== 0) {
            const message = `Department with state '${state}' already exists.`;
            logger.warn(message);
            return res.status(400).json({ message });
        } else {
            // Your original code had `return res.status(400).json(message);` here, which seems like a copy-paste error.
            // Assuming the intent was to save and return success.
            await town.save();
            logger.info(`Department '${state}' created successfully.`, { departmentId: id, country, state });
            return res.status(200).json(town); // Return the created town
        }
    } catch (error: any) {
        logger.error(`Error creating department: ${error.message}`, { stack: error.stack, details: error, body: req.body });
        // The original message `let error = error: ${err}` was just logging the error object.
        next(new CustomError('Error creating department.', 500));
    }
};

