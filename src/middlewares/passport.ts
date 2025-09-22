import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt'
import config from '../config/config'
import User from '../models/user'

const opts: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwtSecret
}

export default new Strategy(opts, async (payload, done) => {
    try {
        const user = await User.findById(payload.id);
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    } catch (error) {
        console.error(error);
    }
})

// rome-ignore lint/suspicious/noExplicitAny: <explanation>
// export  const checkIsInRole = (...roles: any) => (req: any, res: any, next: any): Promise<Response> => {
//     if (!req.user) {
//         return res.status(401).send({ Error: 'Not authorized' });
//     }

//     // rome-ignore lint/suspicious/noExplicitAny: <explanation>
// const  hasRole = roles.find((role: any) => req.user.role === role)
//     if (!hasRole) {
//         return res.status(401).send({ Error: 'Not authorized' });
//     }
//     return next()
// }

export const checkIsInRole = (...roles: any) => (req: any, res: any, next: any): Promise<Response> => {
    if (!req.user) {
        return res.status(401).send({ Error: 'Not authorized' });
    }

    const hasRole = roles.find((role: any) => req.user.role === role)
    if (!hasRole) {
        return res.status(401).send({ Error: 'Not authorized' });
    }
    return next()
}