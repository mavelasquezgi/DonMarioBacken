import mongoose from 'mongoose'
import config from './config/config'
mongoose.set('strictQuery', false);

const dbOptions:any = {
    autoIndex: false, // Don't build indexes
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    maxPoolSize: 40, // Maintain up to 40 socket connections
}

mongoose.connect(config.DB.URI, dbOptions);

const connection = mongoose.connection;

connection.once('open', () => {
    console.info('Mongodb connection stablished');
});

connection.on('error', err => {
    console.error(err);
    process.exit(0);
})