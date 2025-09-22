import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import config from '../config/config';
import path from 'path';

export const sendEmailValidation = (host: any, token: any, email: string, fullname: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            var transporter = nodemailer.createTransport(smtpTransport({
                service: 'webmail',
                host: 'smtp.amass.com.co',
                auth: { user: 'no-reply@amass.com.co', pass: 'aX(b^Po(w7EF' },
                tls: { rejectUnauthorized: false }
            }));
            const srcImage = "https://i.ibb.co/92VBT00/Imagen-Logo-Amass.png"
            let desiredLink = `${host}/auth/confirmation/${token}`;
            var mailOptions = {
                from: 'no-reply@amass.com.co', to: email, subject: 'Bienvenido a tú cuenta con Amas ferreteria',
                html: `<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="padding: 0"><div><img style="padding: 0;max-width: 600px;object-fit: scale-down;" src=${srcImage}></div></td></tr><tr><td style="background-color: #263238; text-align:left;padding: 0"><div class="container" style="height: 35px;"></div></td></tr><tr><td style="background-color: white;"><div style="color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif"><h2 style="color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;">Bienvenido a AMAS FERRETERIA</h2><p style="margin: 2px;margin-top: 4%;font-size: 17px">Hola ` + fullname + '.<br><br>Gracias por registrarte con nosotros, Nuestro objetivo es brindarte los materiales para que puedas cumplir tus metas.<br>Antes de comenzar, por favor valida tu cuenta siguiendo el enlace</p><div style="width: 100%;margin-top: 7%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href="' + desiredLink + '">Validar Correo</a></div><p style="margin: 2px;margin-top: 7%;font-size: 17px">Si no registraste esta cuenta en nuestra plataforma y recibiste por equivocación este correo, por favor ignora este mensaje.<br>Correo desatendido: Por favor no responda a la direccion de correo electronico que envia este mensaje, dicha cuenta no es revisada por ningun funcionario de nuestra entidad. Este mensaje es informativo.<br>Saludos,<br><br>Equipo AMAS.</p><p style="margin: 2px;margin-top: 4%;font-size: 17px"><br><b>Contacto:</b><br>soporteti@amas.com.co<br></p><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0"><br><br>Manizales-Colombia<br>Copyright:AMAS FERRETERIA</p></div></td></tr></table>'
            };
            //html: '<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="background-color: #ecf0f1; text-align:left;padding: 0"><a href="https://www.google.com"><img width="20%" style="display: block;margin: 1.5%" src="https://smrsas.com.co/img/abc.jpg"></a></td></tr><tr><td style="padding: 0;"><img style="padding: 0; display:block" src="img/dash.png"></td></tr><tr><td style="background-color: #ecf0f1;"><div style="color: #34495e;margin 4% 10% 2%; text-align:justify;font-family:sans-serif"><h2 style="color: #e67e22; margin: 0 0 7px">Hello Hello</h2><p style="margin: 2px;font-size: 15px">Este es un ejemplo del cuerpo de un email el cual estoy desarrollando en un ambiente de nodejs mediante el editor visual studio code, espero que este test funcione sin errores para proceder a realizar la implementación del código para testearlo enviando un email a un correo real.</p><ul style="font-size: 15px; margin:10px 0"><li>friendly batles</li><li>official tournaments</li></ul><div style="width: 100%;margin:20px 0; display: inline-block;text-align:center"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"></div><div style="width: 100%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white; background-color:#3498db" href="https://www.google.com">Ir a la página</a></div><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0">Is anyone home?</p></div></td></tr></table>' };
            //text: 'Hola,\n\n' + 'Por favor verifica tu cuenta, haciendo click en este link: \nhttps:\/\/' + req.headers.host + '\/confirmation\/' + .token + '.\n' };
            transporter.sendMail(mailOptions);
            resolve(`Hemos enviado un enlace de verificación a tu correo ${email}`)
        } catch (e) {
            reject('Error sending email');
        }
    });
}

export const functSendAlertEmailLogoLink = async (email: string [], message: string, desiredLink: string): Promise<boolean> => {
    try {
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'webmail',
            host: 'smtp.amass.com.co',
            auth: { user: 'no-reply@amass.com.co', pass: 'aX(b^Po(w7EF' },
            tls: { rejectUnauthorized: false }
        }));
        const srcImage = "https://i.ibb.co/92VBT00/Imagen-Logo-Amass.png"
        var mailOptions = {
            from: 'no-reply@amass.com.co', to: email, subject: 'Estados en pedidos y cotizaciones',
            html: `<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="padding: 0"><div><img style="padding: 0;max-width: 600px;object-fit: scale-down;" src=${srcImage}></div></td></tr><tr><td style="background-color: #263238; text-align:left;padding: 0"><div class="container" style="height: 35px;"></div></td></tr><tr><td style="background-color: white;"><div style="color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif"><h2 style="color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;">AMAS FERRETERIA</h2><p style="margin: 2px;margin-top: 4%;font-size: 17px"> <br>${message}<br>Puedes ver los detalles siguiendo el enlace</p><div style="width: 100%;margin-top: 7%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href=" ${desiredLink} ">Enlace</a></div><p style="margin: 2px;margin-top: 7%;font-size: 17px">Este mensaje se envia de forma automática por favor no responder, ya que este <strong>no sera revisado</strong><br><br>Saludos,<br><br>Equipo AMAS.</p><p style="margin: 2px;margin-top: 4%;font-size: 17px"><br><b>Contacto:</b><br>soporteti@amas.com.co<br></p><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0"><br><br>Manizales-Colombia<br>Copyright:AMAS FERRETERIA</p></div></td></tr></table>`
        };
        //html: '<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="background-color: #ecf0f1; text-align:left;padding: 0"><a href="https://www.google.com"><img width="20%" style="display: block;margin: 1.5%" src="https://smrsas.com.co/img/abc.jpg"></a></td></tr><tr><td style="padding: 0;"><img style="padding: 0; display:block" src="img/dash.png"></td></tr><tr><td style="background-color: #ecf0f1;"><div style="color: #34495e;margin 4% 10% 2%; text-align:justify;font-family:sans-serif"><h2 style="color: #e67e22; margin: 0 0 7px">Hello Hello</h2><p style="margin: 2px;font-size: 15px">Este es un ejemplo del cuerpo de un email el cual estoy desarrollando en un ambiente de nodejs mediante el editor visual studio code, espero que este test funcione sin errores para proceder a realizar la implementación del código para testearlo enviando un email a un correo real.</p><ul style="font-size: 15px; margin:10px 0"><li>friendly batles</li><li>official tournaments</li></ul><div style="width: 100%;margin:20px 0; display: inline-block;text-align:center"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"></div><div style="width: 100%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white; background-color:#3498db" href="https://www.google.com">Ir a la página</a></div><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0">Is anyone home?</p></div></td></tr></table>' };
        //text: 'Hola,\n\n' + 'Por favor verifica tu cuenta, haciendo click en este link: \nhttps:\/\/' + req.headers.host + '\/confirmation\/' + .token + '.\n' };
        transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        return false;
    }
}

export const functSendAlertEmail = async (email: string [], message: string, desiredLink: string): Promise<boolean> => {
    try {
        const cid = Date.now().toString();
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'webmail',
            host: 'smtp.amass.com.co',
            auth: { user: 'no-reply@amass.com.co', pass: 'aX(b^Po(w7EF' },
            tls: { rejectUnauthorized: false }
        }));
        const pathImage = path.join(config.PATH.FILES,'images/ImagenLogoAmass.png')
        var mailOptions = {
            from: 'no-reply@amass.com.co', to: email, subject: 'Estados en pedidos y cotizaciones',
            //html: `<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="padding: 0"><div><img style="padding: 0;max-width: 600px;object-fit: scale-down;" src=${srcImage}></div></td></tr><tr><td style="background-color: #263238; text-align:left;padding: 0"><div class="container" style="height: 35px;"></div></td></tr><tr><td style="background-color: white;"><div style="color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif"><h2 style="color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;">AMAS FERRETERIA</h2><p style="margin: 2px;margin-top: 4%;font-size: 17px"> <br>${message}<br>Puedes ver los detalles siguiendo el enlace</p><div style="width: 100%;margin-top: 7%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href=" ${desiredLink} ">Enlace</a></div><p style="margin: 2px;margin-top: 7%;font-size: 17px">Este mensaje se envia de forma automática por favor no responder, ya que este <strong>no sera revisado</strong><br><br>Saludos,<br><br>Equipo AMAS.</p><p style="margin: 2px;margin-top: 4%;font-size: 17px"><br><b>Contacto:</b><br>soporteti@amas.com.co<br></p><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0"><br><br>Manizales-Colombia<br>Copyright:AMAS FERRETERIA</p></div></td></tr></table>`,
            html: `<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="padding: 0"><div><img style="padding: 0;max-width: 600px;object-fit: scale-down;" src="cid:${cid}" alt="Logo amas"></div></td></tr><tr><td style="background-color: #263238; text-align:left;padding: 0"><div class="container" style="height: 35px;"></div></td></tr><tr><td style="background-color: white;"><div style="color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif"><h2 style="color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;">AMAS FERRETERIA</h2><p style="margin: 2px;margin-top: 4%;font-size: 17px"> <br>${message}<br>Puedes ver los detalles siguiendo el enlace</p><div style="width: 100%;margin-top: 7%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href=" ${desiredLink} ">Enlace</a></div><p style="margin: 2px;margin-top: 7%;font-size: 17px">Este mensaje se envia de forma automática por favor no responder, ya que este <strong>no sera revisado</strong><br><br>Saludos,<br><br>Equipo AMAS.</p><p style="margin: 2px;margin-top: 4%;font-size: 17px"><br><b>Contacto:</b><br>soporteti@amas.com.co<br></p><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0"><br><br>Manizales-Colombia<br>Copyright:AMAS FERRETERIA</p></div></td></tr></table>`,
            attachments: [
                {
                  filename: 'amaslogo.png',
                  path: pathImage,
                  cid: cid
                }
              ]
        };
        //html: '<table style="max-width: 600px;padding: 10px;margin:0 auto; border-collapse:collapse;"><tr><td style="background-color: #ecf0f1; text-align:left;padding: 0"><a href="https://www.google.com"><img width="20%" style="display: block;margin: 1.5%" src="https://smrsas.com.co/img/abc.jpg"></a></td></tr><tr><td style="padding: 0;"><img style="padding: 0; display:block" src="img/dash.png"></td></tr><tr><td style="background-color: #ecf0f1;"><div style="color: #34495e;margin 4% 10% 2%; text-align:justify;font-family:sans-serif"><h2 style="color: #e67e22; margin: 0 0 7px">Hello Hello</h2><p style="margin: 2px;font-size: 15px">Este es un ejemplo del cuerpo de un email el cual estoy desarrollando en un ambiente de nodejs mediante el editor visual studio code, espero que este test funcione sin errores para proceder a realizar la implementación del código para testearlo enviando un email a un correo real.</p><ul style="font-size: 15px; margin:10px 0"><li>friendly batles</li><li>official tournaments</li></ul><div style="width: 100%;margin:20px 0; display: inline-block;text-align:center"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"><img style="padding: 0; width: 200px; margin: 5px" src="img/dash.png"></div><div style="width: 100%;text-align:center"><a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white; background-color:#3498db" href="https://www.google.com">Ir a la página</a></div><p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0">Is anyone home?</p></div></td></tr></table>' };
        //text: 'Hola,\n\n' + 'Por favor verifica tu cuenta, haciendo click en este link: \nhttps:\/\/' + req.headers.host + '\/confirmation\/' + .token + '.\n' };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return false;
    }
}