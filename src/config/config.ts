export default {

    jwtSecret: process.env.JWT_SECRET || '26e84f92066bb21f5690ee602160a53dd0e515ef80af9e3dc1f9b9f50993a53f',
    jwtRefresh: process.env.JWT_SECRET || '1e81e9e9fc28a531933b5f421132ab1cb61b55c25c8cc1937504dc4ed29fed0b',
    TokenByAccesss: process.env.AT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlptVnNhV05wZEdGamFXOXVaWE1zSUcxbElHaGhjeUJrWlhOamRXSnBaWEowYnl3Z1lXd2dabWx1WVd3Z2JtOGdaWE1nZEdGdUlITmxaM1Z5Ync9PSIsImlhdCI6MTY3NzYzMjU1MiwiZXhwIjoxZSs5NiwiYXVkIjoiWm1Wc2FXTnBkR0ZqYVc5dVpYTXNJRzFsSUdoaGN5QmtaWE5qZFdKcFpYSjBieXdnWVd3Z1ptbHVZV3dnYm04Z1pYTWdkR0Z1SUhObFozVnlidz09IiwiaXNzIjoiYW1hc3MuY29tLmNvIn0.hl4zIgRmtOxOgOV6P4W3XY1DtB957m-H6evkBJhmeoY',
    PORT: process.env.PORT || 3501,
    DB: {
        URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/donmario',
        USER: process.env.MONGODB_USER || 'adminamasmario',
        PASSWORD: process.env.MONGODB_PASSWORD || 'pwdAmasMario2025',
    },
    // este apartado es para la configuracion de multer
    PATH: {
        ERRORFILE: process.env.URL_ERRFILE || '/home/mauro/Documents/amas/errors.txt',
        URLIMAGESPRODUCT: process.env.URL_IMAGESPRODUCT || '/home/mauro/Documents/amas/imagesProducts',
        URLIMAGESMARKS: process.env.URL_IMAGESMARKS || '/home/mauro/Documents/amas/imagesMarks',
        URLIMAGESCATEGORIES: process.env.URL_IMAGESCATEGORIES || '/home/mauro/Documents/amas/imagesCategories',
        URLSUPPORTPAY: process.env.URL_SUPPORTPAY || '/home/mauro/Documents/amas/supportsPayments',
        URLPDFQUOTES: process.env.URL_PDFQUOTES || '/home/mauro/Documents/amas/pdfQuotes',
        URLPDFORDER: process.env.URL_PDFORDER || '/home/mauro/Documents/amas/pdfOrder',
        FILES: process.env.URL_PATH_FILES || '/home/mauro/Documents/amas/files',
        TEMP: process.env.URL_PATH_TEMP || '/home/mauro/Documents/amas/temp'

    },
    HOST: {
        URL: process.env.URL_HOST || 'http://localhost:3501/api',
    },
    COMPANY: {
        NAME: process.env.NAME_COMPANY || 'Manuel Fernando Velasquez Giraldo',
        ID: process.env.ID_COMPANY || 'Cc. 1058845765',
        ADDRESS: process.env.ADDRESS_COMPANY || 'Cr 22 # 48C - 12 Barr San Jorge - Manizales',
        TYPE: process.env.TYPE_COMPANY || 'Responsable de IVA',
        PHONE: process.env.PHONE_COMPANY || '3122556994',
        LOGO: process.env.LOGO_COMPANY || '/home/mauro/Documents/git/amasFrontendAngUni/src/assets/imgs/ImagenLogoAmass.png',
        EMAILALERTS: process.env.EMAIL_ALERTS || 'alertsferreteriaamas@gmail.com', //'ninefoxfire9@gmail.com',
    },
    EXTERNAL_API: {
        //PYTHONSCRIPTS: process.env.PYTHONSCRIPTS || '/home/mauro/Documents/amas/scripts/pythonScripts',
        PYTHONSCRIPTS: process.env.PYTHONSCRIPTS || '/home/mauro/Documents/git/DonMarioBacken/scripts/pythonScripts'
    }

}