import { mkdirp } from "mkdirp";
import multer from "multer";
import config from "../config/config";
import {imageFilter, imagePdfFilter } from '../helpers/helpers'
import { format } from "date-fns";

var storage = multer.diskStorage({ //multers disk storage settings
    destination: async function (req, file, cb) {
        let folder = `${config.PATH.URLIMAGESPRODUCT}`;
        await mkdirp(folder).then(made => console.info(`made directories, starting with ${made}`))
        cb(null, folder); //image storage path
    },
    filename: function (req, file, cb) {
        // para nombre de archivo https://www.youtube.com/watch?v=OMBwyCNmoPY min 53
        const CURRENTDATE: string = `_Generated_${format(new Date(), 'yyyy-MM-dd_HH:mm:ss')}`;
        let s = file.originalname;
        let substring = s.substring(s.lastIndexOf("."));
        let random = String(Math.round(Math.random() * 1000));
        let filename = `${random}_${Date.now()}${CURRENTDATE}${substring}`
        cb(null, filename);
    }
});

var storageSupport = multer.diskStorage({ //multers disk storage settings
    destination: async function (req, file, cb) {
        let folder = `${config.PATH.URLSUPPORTPAY}`;
        await mkdirp(folder).then(made => console.info(`made directories, starting with ${made}`))
        cb(null, folder); //image storage path
    },
    filename: function (req, file, cb) {
        // para nombre de archivo https://www.youtube.com/watch?v=OMBwyCNmoPY min 53
        const CURRENTDATE: string = `_Generated_${format(new Date(), 'yyyy-MM-dd_HH:mm:ss')}`;
        let s = file.originalname;
        let substring = s.substring(s.lastIndexOf(".")).toLowerCase();
        let random = String(Math.round(Math.random() * 1000));
        let filename = `${random}_${Date.now()}${CURRENTDATE}${substring}`
        cb(null, filename);
    }
});

var storageMark = multer.diskStorage({ //multers disk storage settings
    destination: async function (req, file, cb) {
        let folder = `${config.PATH.URLIMAGESMARKS}`;
        await mkdirp(folder).then(made => console.info(`made directories, starting with ${made}`))
        cb(null, folder); //image storage path
    },
    filename: function (req, file, cb) {
        // para nombre de archivo https://www.youtube.com/watch?v=OMBwyCNmoPY min 53
        const CURRENTDATE: string = `_Generated_${format(new Date(), 'yyyy-MM-dd_HH:mm:ss')}`;
        let s = file.originalname;
        let substring = s.substring(s.lastIndexOf("."));
        let random = String(Math.round(Math.random() * 1000));
        let filename = `${random}_${Date.now()}${CURRENTDATE}${substring}`
        cb(null, filename);
    }
});

var storageCategory = multer.diskStorage({ //multers disk storage settings
    destination: async function (req, file, cb) {
        let folder = `${config.PATH.URLIMAGESCATEGORIES}`;
        await mkdirp(folder).then(made => console.info(`made directories, starting with ${made}`))
        cb(null, folder); //image storage path
    },
    filename: function (req, file, cb) {
        // para nombre de archivo https://www.youtube.com/watch?v=OMBwyCNmoPY min 53
        const CURRENTDATE: string = `_Generated_${format(new Date(), 'yyyy-MM-dd_HH:mm:ss')}`;
        let s = file.originalname;
        let substring = s.substring(s.lastIndexOf("."));
        let random = String(Math.round(Math.random() * 1000));
        let filename = `${random}_${Date.now()}${CURRENTDATE}${substring}`
        cb(null, filename);
    }
});

export const middlewareUploadProduct = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 100
    },
    fileFilter: imageFilter,
}).single('file')


export const middlewareUploadSupport = multer({
    storage: storageSupport,
    limits: {
        fileSize: 1024 * 1024 * 100
    },
    fileFilter: imagePdfFilter,
}).single('file')

export const middlewareUploadMark = multer({
    storage: storageMark,
    limits: {
        fileSize: 1024 * 1024 * 100
    },
    fileFilter: imageFilter,
}).single('file')

export const middlewareUploadCategory = multer({
    storage: storageCategory,
    limits: {
        fileSize: 1024 * 1024 * 100
    },
    fileFilter: imageFilter,
}).single('file')