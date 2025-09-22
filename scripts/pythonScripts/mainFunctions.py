import locale
from pymongo import MongoClient
from bson.objectid import ObjectId
from xml.dom.minidom import Document
from typing import List

def createDOM() -> Document:
    from xml.dom.minidom import getDOMImplementation
    impl = getDOMImplementation()
    dt = impl.createDocumentType(
        "html",
        "",
        "",
    )
    return impl.createDocument("", "html", dt)

def createHmlOnStr(inpListContent,inpCid,inpTitle):
    contenido_html = f'''<table style="max-width: 900px;padding: 10px;margin:0 auto; border-collapse:collapse;">
    <tr>
        <td style="padding: 0">
            <div>
                <img style="padding: 0;max-width: 600px;object-fit: scale-down;" src="cid:{inpCid}" alt="Logo amas">
            </div>
        </td>
    </tr>
    <tr>
        <td style="background-color: #263238; text-align:left;padding: 0;">  
            <div class="container" style="height: 35px;">
            </div>
        </td>
    </tr>
    <tr>
        <td style="background-color: white;">
            <div style="color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif">
                <h2 style="color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;">{inpTitle}</h2>'''
    for elem in inpListContent:
        contenido_html += f'<p style="margin: 2px;margin-top: 4%;font-size: 17px">{elem}</p>'
                
    contenido_html += '''<p style="margin: 2px;margin-top: 7%;font-size: 17px">Correo desatendido: Por favor no responda a la direccion de correo electronico que envia este mensaje, dicha cuenta <strong>no es revisada por ningun funcionario de nuestra entidad.</strong> Este mensaje es informativo.<br><br>Saludos,<br><br>Equipo AMAS.</p>
                <p style="margin: 2px;margin-top: 4%;font-size: 17px"><b>Contacto:</b><br>soporteti@amas.com.co<br></p>
                <p style="color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0"><br>Manizales-Colombia<br>Copyright:AMAS FERRETERIA</p>
            </div>
        </td>
    </tr>
    </table>'''


    #! del print
    print(contenido_html)
    return contenido_html

def createHtml(inpListContent: List[str], inpTitle, inpCid) -> str:
    dom = createDOM()
    html = dom.documentElement
    head = dom.createElement("head")
    meta = dom.createElement("meta")
    meta.setAttribute("http-equiv", "Content-Type")
    meta.setAttribute("content", "text/html charset=UTF-8")
    head.appendChild(meta)
    html.appendChild(head)
    # * add html content
    table1 = dom.createElement("table")
    table1.setAttribute("style", "background-color:#e9e9e9; padding: 20px 10px; border-radius: 5px;")
    table1_tr1 = dom.createElement("tr")
    table1_tr1_td1 = dom.createElement("td")
    table1_tr1_td1.setAttribute("style","padding: 0")
    table1_tr1_td1_div1 = dom.createElement("div")
    table1_tr1_td1_div1_img1 = dom.createElement("img")
    table1_tr1_td1_div1_img1.setAttribute("style","padding: 0;max-width: 600px;object-fit: scale-down;")
    table1_tr1_td1_div1_img1.setAttribute("src",f"cid:{inpCid}")
    table1_tr1_td1_div1_img1.setAttribute("alt","logoAmas")
    table1_tr1_td1_div1.appendChild(table1_tr1_td1_div1_img1)
    table1_tr1_td1.appendChild(table1_tr1_td1_div1)
    table1_tr1.appendChild(table1_tr1_td1)
    table1.appendChild(table1_tr1)
    table1_tr2 = dom.createElement("tr")
    table1_tr2_td1 = dom.createElement("td")
    table1_tr2_td1.setAttribute("style","background-color: #263238; text-align:left;padding: 0;")
    table1_tr2_td1_div1 = dom.createElement("div")
    table1_tr2_td1_div1.setAttribute("style","height: 35px;")
    table1_tr2_td1_div1.setAttribute("class","container")
    table1_tr2_td1.appendChild(table1_tr2_td1_div1)
    table1_tr2.appendChild(table1_tr2_td1)
    table1.appendChild(table1_tr2)

    table1_tr3 = dom.createElement("tr")
    table1_tr3_td1 = dom.createElement("td")
    table1_tr3_td1.setAttribute("style","background-color: white;")
    table1_tr3_td1_div1 = dom.createElement("div")
    table1_tr3_td1_div1.setAttribute("style","color: #34495e;margin 4% 10% 2%;text-align:justify;font-family:sans-serif")
    table1_tr3_td1_div1_h21 = dom.createElement("h2")
    table1_tr3_td1_div1_h21.setAttribute("style","color: #00B1EE;text-align:center; margin: 0 0 7px;margin-top: 7%;")
    table1_tr3_td1_div1_h21.appendChild(dom.createTextNode(f"{inpTitle}"))
    table1_tr3_td1_div1.appendChild(table1_tr3_td1_div1_h21)
    # loop for add content
    for elem in inpListContent:
        table1_tr3_td1_div1_p = dom.createElement("p")
        table1_tr3_td1_div1_p.setAttribute("style","margin: 2px;margin-top: 4%;font-size: 17px;")
        table1_tr3_td1_div1_p.appendChild(dom.createTextNode(f"{elem}"))
        table1_tr3_td1_div1.appendChild(table1_tr3_td1_div1_p)

    table1_tr3_td1_div1_pMAuto = dom.createElement("p")
    table1_tr3_td1_div1_pMAuto.setAttribute("style","margin: 2px;margin-top: 7%;font-size: 17px;")
    table1_tr3_td1_div1_pMAuto.appendChild(dom.createTextNode(f"Este mensaje se envia de forma automática por favor no responder"))
    table1_tr3_td1_div1_pMAuto_br1 = dom.createElement("br")
    table1_tr3_td1_div1_pMAuto.appendChild(table1_tr3_td1_div1_pMAuto_br1)
    table1_tr3_td1_div1_pMAuto_br2 = dom.createElement("br")
    table1_tr3_td1_div1_pMAuto.appendChild(table1_tr3_td1_div1_pMAuto_br2)
    table1_tr3_td1_div1_pMAuto.appendChild(dom.createTextNode(f"Saludos,"))
    table1_tr3_td1_div1_pMAuto_br3 = dom.createElement("br")
    table1_tr3_td1_div1_pMAuto.appendChild(table1_tr3_td1_div1_pMAuto_br3)
    table1_tr3_td1_div1_pMAuto_br4 = dom.createElement("br")
    table1_tr3_td1_div1_pMAuto.appendChild(table1_tr3_td1_div1_pMAuto_br4)
    table1_tr3_td1_div1_pMAuto.appendChild(dom.createTextNode(f"Equipo AMAS."))
    table1_tr3_td1_div1.appendChild(table1_tr3_td1_div1_pMAuto)
    table1_tr3_td1_div1_pContact = dom.createElement("p")
    table1_tr3_td1_div1_pContact.setAttribute("style","margin: 2px;margin-top: 7%;font-size: 17px;")
    table1_tr3_td1_div1_pContact_br1 = dom.createElement("br")
    table1_tr3_td1_div1_pContact.appendChild(table1_tr3_td1_div1_pContact_br1)
    table1_tr3_td1_div1_pContact.appendChild(dom.createTextNode(f"Contacto:"))
    table1_tr3_td1_div1_pContact_br2 = dom.createElement("br")
    table1_tr3_td1_div1_pContact.appendChild(table1_tr3_td1_div1_pContact_br2)
    table1_tr3_td1_div1_pContact_br3 = dom.createElement("br")
    table1_tr3_td1_div1_pContact.appendChild(table1_tr3_td1_div1_pContact_br3)
    table1_tr3_td1_div1_pContact.appendChild(dom.createTextNode(f"soporteti@amas.com.co"))
    table1_tr3_td1_div1_pContact_br4 = dom.createElement("br")
    table1_tr3_td1_div1_pContact.appendChild(table1_tr3_td1_div1_pContact_br4)
    table1_tr3_td1_div1.appendChild(table1_tr3_td1_div1_pContact)
    table1_tr3_td1_div1_pCright = dom.createElement("p")
    table1_tr3_td1_div1_pCright.setAttribute("style","color: #b3b3b3; font-size: 12px; text-align: center;margin: 30px 0 0")
    table1_tr3_td1_div1_pCright_br1 = dom.createElement("br")
    table1_tr3_td1_div1_pCright.appendChild(table1_tr3_td1_div1_pCright_br1)
    table1_tr3_td1_div1_pCright.appendChild(dom.createTextNode(f"Manizales-Colombia"))
    table1_tr3_td1_div1_pCright_br2 = dom.createElement("br")
    table1_tr3_td1_div1_pCright.appendChild(table1_tr3_td1_div1_pCright_br2)
    table1_tr3_td1_div1_pCright.appendChild(dom.createTextNode(f"Copyright:AMAS FERRETERIA"))
    table1_tr3_td1_div1.appendChild(table1_tr3_td1_div1_pCright)
    table1_tr3_td1.appendChild(table1_tr3_td1_div1)
    table1_tr3.appendChild(table1_tr3_td1)
    table1.appendChild(table1_tr3)
    # * end add html content
    return dom.toxml()

def sendEmail(inpEmailServer: str, inpPWDEmailServer: str,inpServerSMTP: str,inpEmailClient: List[str],inpPortSetrverSMTP: int,inpPathImg: str,inpSubject: str,inpTitle: str, inpListContent: str):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.image import MIMEImage
    import base64

    destinatarios = inpEmailClient

    # Credenciales de acceso al correo
    usuario = inpEmailServer
    contrasena = inpPWDEmailServer

    # Crear objeto de mensaje
    mensaje = MIMEMultipart()

    # Establecer remitente y destinatario
    mensaje['From'] = usuario
    mensaje['To'] = ", ".join(destinatarios)
    mensaje['Subject'] = inpSubject

    # Cargar la imagen en base64
    with open(inpPathImg, 'rb') as f:
        imagen_base64 = base64.b64encode(f.read()).decode('ascii')
        #! del print
        #print(imagen_base64)

    # Crear la parte HTML del mensaje con la imagen adjunta
    cid = 'idImage'
    contenido_html = createHmlOnStr(inpListContent,cid,inpTitle)


    #! del print
    print(contenido_html)

    # Crear la parte de texto del mensaje
    parte_texto = MIMEText(contenido_html, 'html')
    mensaje.attach(parte_texto)

    # Crear la parte de la imagen adjunta y establecer el CID
    imagen = MIMEImage(base64.b64decode(imagen_base64))
    imagen.add_header('Content-Disposition', 'attachment', filename='logoAmas.png')
    imagen.add_header('Content-ID', f'<{cid}>')
    mensaje.attach(imagen)

    # Conectar al servidor SMTP y enviar el correo
    with smtplib.SMTP(inpServerSMTP, inpPortSetrverSMTP) as servidor:
        servidor.starttls()
        servidor.login(usuario, contrasena)
        servidor.send_message(mensaje)

stringImageLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAABiCAMAAAB+iy8AAAAB5lBMVEUAAACCGhWjHRS3Ixm4Ixi2IxqtHxe4JBm3IxmxqEOaGxO0IRe3IxjC1FW2Ihi2IxixIBfD2WFypKyrHxixIRbIuj9aoJVquJqtHxasy2z/3Vb/3iAvWZv62ZNhDw8uYaRytN5nqdj+3Rz82h7tzCaEvNksUJP/3yNVr5j51Xx3tID31hqQxoL62SmLv3y1yD+/1FSn3PLV4UT+3hu56Puq4/f61haY0OctXpSUyeDR30r/4FZNsp3N2E3312spTolandG65/t6wZSo4vnV4UL+3hw8f75itJMsXZWxyVaDuHi7zEFRlc1Vs5rM4V4tWZpluJic3fksU5VFmcdWqLo3hsKcyXi41WMuY6L83qQuUpWQw3r+31b726SIzO5bqNv94ah5v+Skx2+91FN/wo5Cj8i512Rgrd2S1PNUs5n83Jfw0IH+4q2f3PhHocS15/o8frxfp9WCwOD92ml1vJC1Ihm24fb/2SKex3HJ2VSWxHvQ3EiEwI2Pw4amyWR7vpOj2/VLqNo+ksqZ1fExd7ZDndE8iMMpoZm13O732qH63Ko3gb0tbKyKyuxSs+GyzWFzu5hiteGBw+f+3GK50F13vONgtJr92mv+2jP+20WVzNn20R89pKB5sX9UsLJ8v8muvWfczD4WNvPkAAAAdXRSTlMAFS+z5/NI2s8WIIGg/pPCWf4VZG8kJP06/vzx/fss/f79vWcvLPje/v1AQ9mBdzSVYebQyYVZTj85186cdFol/uviz6ObfmxfXVpM+uTNwb+1fmJK6+vq27+lo6OI3dzUzsbGurespZ+Hazju7NKgl3eI6Z4S8Hd6AAALO0lEQVR42uzZ7U9SURwH8FP2RGXlbVzXO3nBG+d4aHMGG41Vq4hqsUhrDcksodKWrRphPATBpj0IDvx7+57fOYdz41K+a+c6vrdXlmsfv99zUGTjjDPOOOOM8//j8/vDYb/fxw5l/KnE2n3KjUSYHbb4U2v3p6amPsvEI4eK6EtHoNM+Iia8MlSL55+81NoScATEA9wW/mxdjviZ+bEW5osZZD4as/7CuwOe0ulsITeMF1rRzEZd5nomGmTuzD5dLF26dGm3R0YQJyWQOjR8pcGi5CnjfGzoX9ihuZJIlYxOHnI5wUxOLFOvN5t1PC6irq9cUsJqFUQApxwjjZt8lwYzTRGn8dP1BT3g0Fy5XFY+Lqz2JiHUQBxDc0dqFR2+OhkJOKjQRn0OoIgWblEup5mpiW40dfRGY3qexCMhNSiFGvjZ6Apjy83mTzyIo0c90Fk+T1eDu9VdqnASOLMrtIo/VRTwD9+duUrZ3aCqcFIWSBUyI7OwvLfXR7rdbh9IIdyIOnyVSpmMCqgr1C8TVKGRF6lV6HdngPuFcCEZN+Ytp0/yFHBA1A2KGPlamM13ka/gceGeEBZt7RPA0Q3qM2juK0WB8xAJJOFyUN0v8Gnh6DOI/ky+ZoJ5wRNEAPfgW1C+F5UveMhXwURdtyiEmKjRG93kPCJq4Ht5AO0XHEdCd4PChwc8vdEjzLDYBdhaA2SfA1fkQK0PX3iGJ6q/kREN0jaROGLeIczmWy0iUoUEHAz01jXykRATlT5ZX68nBxqPr96IJFLpdDgcNvAtqM0WMmiw24ewaMkDSD7whq5RwaMC46uRRDrsM481iPWyRZErnQFwOaYOYO0LZQgIHvf1llYjqbDBNKl4K3SixC4HvmcioVqtNlRhqcx/2IWP69LGv0nBk221GnjkOZwBcCWoBiqBFSEU/eENC8QrOuRmAzrwiEjATXWD1pwNljkQPPiWVhPmL3OQdw2EKkSBAQBXbHWDCp+eKHzI0lrKOzp+xzRIKALgjCzQftDpdPRCqT/v8eAAUBGpQXUCb3UIqCda4r7nHuMxduWRAoKYBPD9cIGI8j0PeY2ngRAScCUrC5x2AMlXWvTkr1huA9hWwkAgULBkgdPT0zUAa/wMku95inkqPgVstxWRAx/KAuHryEuUfIue+OXKIP6ruRyjPAQQPMrdQCBvi7v1gQDWlM9bp+9N7sn6zhOfBiISWGCU2Xu0UAHkvlnmnbzJPVvf2XECKQRUC321v48CESpw8anNPBPf62fQOYDfvrcVMZnMB+UVA6D2eWmevtw61207gULYaLeTSXmHZu8pIHxzIeadaJ8C3v6hhBy4OVjovlhopWKC78hw2N/yel3wtrd3nmkgIoD5rLxDAZQFzt05+L+/cGTEx44yVw76+xMjP+f0hXMTQzl75sRo4xs6f+BxoF98J/P4G4SCePetLe9QtdCDfcjFUyfcgIkJ/UF3Tp8Z8TlHz59hI9QTxz66cvzkuZFfjN/tmN9r01AUx5OuSdqmZsW2Wtppoa12s1QUdSqVypSpiKKoD/6YD4o+iKCi1oIo+CDWBx+EiXWu/vpPPbm5Nyf2e0sj6MOg36FsSbf2k885597ktsQTgA8lICkUIcD7cpW/uCgq9JW2PpGl55mag6mc+gFR5qwkAhasVAIPOj195m0DUrxBdCq7uuLYSQJUhBfOyBZcXJQVinyYXLLnlDSAvaSbMbSx5+mkDVbpKCjMMR8Qwpsa3V0RvqUA0Lj0gQjfBoBXgxY8sbi4M+DbPp0vQyg9TwNIENmEzjhJEYAgsNcbV5gg6InJmjBidim6XUvDoXzGfrPqKyRGApSroKrQWOt7zm8Rx0ZAP5pGzHjJngREFmtMoWvJnvsj8mDSRsAgS0tDypoco9WqT0df78IZE1TovYn7MyTxTDgsksqPnSjNWfpPl6fjrJCrluJ49h/JZa3gTfWAS+WhSEeO0SopFA7f3d8hl3lRoafOGzEFKoUICI2YS/X48iPLWBeWHPHSPFxVL+jCDAAuUTb6X9aJb73TkFNmwQf0DfIQ/Uh8cQYMg3hwXMaKNKLpOj0GBIGg0E6KOpdFAOQwdLs+X7nf72+sD9fXn3VlEy4IhWTwSThECfDejvgCKU4JAGGgJ6j9GFA/TSwXALO6QeVSCuPkD59R933pC0JK2xC5skAKhcMQ8DMJ3BdXICuEEwo++CQ2tR8C8ghlhWAwZoqd4XCj7+dLmQDX0nKpX6gGgHIZPOG34H4jvkDZhQDINLTvMPOi/RgQ1hpUmAh6sBCXML02XCeBSqGcMicvSYUM+HF6gSKGZ8IZK6XG/Jwdtp/jAKDoQFSouJ1sIR9Jzs4YE9J9Vu7LkMJyl2tUECrAzx95gsYaodiFBCgoPEsZs1RH5rIAKEGS1rjCgnYdTKbckqFNo7OhAL8Q4JoR1ugHQgwBd358bvyFwFQ+IPQQcLep9pI8U00JCAKTbnaCQozjZvQ1KipUFmm505BzdO/Cn4A0YeILtAqmJxUiYLjy8aqIgJl5uazZyXGFtjOB0PK0hN1KP1RYLqsaPbd3r6+QAc/GExhecFsqNAFQ7V14XwOASqCVD0siATsDHaGpq9FanxWWy2tpOWZIIQM+uBzvGVPkeiuFCMi7T5o0BIWAqg7nSAkqNOysYwGd2uBg2hUmLJc7D+WYEQrfynXw7LW/FEiWWCEAivsH3tIgYF5W+tjfVDFtNzsXzbzT450aKDzUjxZp24gqlIDb/SVzuX3g1okTJ54eefz4yME9eoG8eeQuBEB5B2g5rmkAoHwpf9wcKsRnMnbwG9ZUhRvlTjGq8JIS0Ggf2vZtNPr+9f0LPyuHjwAi90t0GLgIqHZp8v4eAXOWFAh/VR/e2GXN6QrrrLD64dLJ4Kfl2ubP0WD0g/BUDh80xsLXGhQCIAcBM0og1gWGL4r6HUz9T4UNHqTV6wFgvbn5cjAY+fo4K1FC7JZwkMYHhA78G4VitjraFxVr/SghKVRrYbV6zKC0mps/B4OB9McOj2s7cAzYKcUGBIFYGQnXo2Cr0crJgJBWtEg3lMJjfpEeCy7Ar9Fg8F3ycR5vnyQQuzA+YE4JHJ85Cb6byKBBBzRDkSrCtiGLlADPibOb30jgVybDIoUFi7swVYoLiCMUkEuwL5cp9Jgck16NtmGzZahJunCFTrLA96BQLxAVxgfM8wiF8cxbAH4bbPhJbcgK14pykt4kQL+AoQNVF+7RCUTomIDYgdiFrhWcL5QSnJIr+NgsphElrLQNRXiTlogKjVCqUN/gmMOVozoWVBgTEDsQuzCRUo/qUxxHUPOd/tRBExbpMTJY7wctKNjGCI9qBWIXxgPEDlSxGbtAMBB8hIBZjhLWGnyCAelrzOJRFIgKiTs2IG9iJik0vUmESf6t6Q5X0wxY2XwdGuT/GBDWQOzCUkxABtE/KSjwrQj6gwc1QBjpw0pbEfIyjwJXjusFYhfGAoQO5GQi2xkzPw8SxZ3X1DRWK0xYj0zYXwT4nQCVPMV4WC4TpXnHj6ZETE+cmcsQhUPRbxZdh0Ka+dWQXEq8Jhes6vk5/0dOKpsDfboU282QsBkStsVCP/qKBo8ojIQIvkf0VEZ8Y+iSUa9JiGj44FQmweHDU5NePlRhQm7OT2ohDP7xZnTrpbHaBEKlkPF4p/ZPY8ZxYPxlUGKtogiXw53cLyL8/obwmHDlyPZ//BHSpvEfg4hMWJSEXwUe823ZFJdFoXKVpuu1ys9FIgz1HT64hfl8ola71qywQ6NYX63dvfzo0Z3ThymP6anTlk+6RUyHai322mjsoOzZs2dry4syFhuthjHLLLPMMssss2yt/AZjyiquRunHFAAAAABJRU5ErkJggg=="

OPTIONSPDF = {
    "preorder": "preorder",
    "order": "order",
    "quote": "quote",
    "product": "product",
}

def conectionMongo(inpUri,inpDb,inpColl):
    MONGO_URI = inpUri
    client = MongoClient(MONGO_URI)
    db = client[inpDb]
    collection = db[inpColl]
    return collection


#sendEmail('no-reply@amass.com.co','aX(b^Po(w7EF','smtp.amass.com.co',['ninefoxfire9@gmail.com','jdperdomos@unal.edu.co'],587,'/Users/joseperdomosaenz/Documents/Data/Stakeholders/files/ic-logo-stakeholder-autoreport.jpg','Correo con imagen base64','Cotizaciones que vencen hoy',['link de la cotización <a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href="https://amass.com.co/orders/quote/645ff7c3c8276860e988931b">Enlace</a>','link de la cotización <a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db" href="https://amass.com.co/orders/quote/646d25813a48267a6c9e2d44">Enlace</a>','...','<strong>Le parece que asi esta bien el reporte de las cotizaciónes que se vencen el dia actual</strong>'])


