from random import random as rand, randint
from datetime import date, datetime, timedelta
import sys
from pathlib import Path
from weasyprint import HTML
from lxml import html
from xml.dom.minidom import getDOMImplementation, Document
from pymongo import MongoClient
from bson.objectid import ObjectId
import pytz

stringImageLogo = "data:image/png;base64,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"

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

def getRegisterById(inpId, inpUri, inpDb, inpColl):
    try:
        # Intenta conectar a la base de datos
        collection = conectionMongo(inpUri, inpDb, inpColl)
        
        # Si la conexión es exitosa, intenta obtener el registro
        registerObj = collection.find_one({"_id": ObjectId(inpId)})
        print(registerObj)
        print("register")
        
        return registerObj
    
    except ConnectionFailure:
        # Si la conexión falla, muestra un mensaje de error y sal del programa
        print("¡Error de conexión! No se pudo conectar a la base de datos.")
        print("Asegúrate de que la base de datos MongoDB esté en ejecución y sea accesible.")
        sys.exit(1) # El código de salida 1 indica que el programa terminó con un error
    
    except Exception as e:
        # Captura cualquier otro error, como un ID inválido, y muestra un mensaje
        print(f"Ocurrió un error: {e}")
        return None

def createDOM() -> Document:
    impl = getDOMImplementation()
    dt = impl.createDocumentType(
        "html",
        "",
        "",
    )
    return impl.createDocument("", "html", dt)

def fecha_en_espanol_con_timezone(fecha_utc: datetime) -> str:
    """
    Convierte una fecha/hora de formato UTC a la zona horaria local y la formatea en español.
    
    Args:
        fecha_utc: Objeto datetime en formato UTC.

    Returns:
        Una cadena de texto con la fecha y hora formateada en español y en la zona horaria local.
    """
    # 1. Asegurarse de que la fecha de entrada es UTC
    if fecha_utc.tzinfo is None:
        fecha_utc = pytz.utc.localize(fecha_utc)

    # 2. Convertir la fecha a la zona horaria de Bogotá (o la que necesites)
    zona_horaria_local = pytz.timezone('America/Bogota')
    fecha_local = fecha_utc.astimezone(zona_horaria_local)
    
    # 3. Diccionarios para los nombres de los días y meses en español
    dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    
    # Obtener el nombre del día y del mes
    dia_semana = dias[fecha_local.weekday()]
    mes = meses[fecha_local.month - 1]
    
    return f"{dia_semana}, {mes} {fecha_local.day} {fecha_local.year} {fecha_local.strftime('%H:%M:%S')}"

    
# Crear elementos con atributos
def create_element(dom, tag, text=None, **attrs):
    element = dom.createElement(tag)
    for key, value in attrs.items():
        element.setAttribute(key, value)
    if text:
        element.appendChild(dom.createTextNode(text))
    return element

def safe_get(data, key, default=""):
    value = data.get(key, default)
    return value if value not in [None, ""] else default

# Sección de información del cliente
# Sección de información del cliente
def create_info_section(dom, inp_quote, stringImageLogo, registerType):
    main_div = create_element(dom, "div", style="width: 100%;")

    # --- Encabezado: Logo (50%) e Información de la Cotización (50%) ---
    header_container = create_element(dom, "div", style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 20px;")
    
    # Contenedor para el logo (50% del ancho)
    img_container = create_element(dom, "div", style="flex-basis: 50%; text-align: left;")
    img_container.appendChild(create_element(dom, "img", src=stringImageLogo, style="width: 100%; max-width: 250px;"))
    header_container.appendChild(img_container)

    # Contenedor para la información de la cotización (50% del ancho)
    quote_info_container = create_element(dom, "div", style="flex-basis: 50%; text-align: right; font-size: 10px; margin-left: 10px;")
    
    quote_info = []
    if inp_quote["type"] == 'QUOTE':
        quote_info.append(("Cotización: ", inp_quote["idQuote"]))
    elif inp_quote["type"] == 'ORDER':
        quote_info.append(("Pedido: ", inp_quote["idQuote"]))
    quote_info.append(("Fecha: ", fecha_en_espanol_con_timezone(inp_quote["createdAt"])))
    for label, value in quote_info:
        p = create_element(dom, "p", style="margin: 2px 0;")
        p.appendChild(create_element(dom, "strong", label))
        p.appendChild(dom.createTextNode(value))
        quote_info_container.appendChild(p)

    header_container.appendChild(quote_info_container)
    main_div.appendChild(header_container)

    # --- Fila Inferior: Información del Cliente (50%) e Información de la Empresa (50%) ---
    content_container = create_element(dom, "div", style="display: flex; justify-content: space-between;")

    # Columna izquierda: información del cliente
    left_column_client = create_element(dom, "div", style="flex-basis: 50%; margin-right: 10px; font-size: 10px;")
    client_info = [
        ("Cliente: ", f'{safe_get(inp_quote, "clientNames")} {safe_get(inp_quote, "clientLastnames")}'),
        ("NIT/CC: ", safe_get(inp_quote, "idClient")),
        ("Dirección: ", safe_get(inp_quote, "addressClient")),
        ("Ciudad: ", safe_get(inp_quote, "cityClient")),
        ("Teléfono: ", safe_get(inp_quote, "phoneClient")),
    ]
    for label, value in client_info:
        p = create_element(dom, "p", style="margin: 2px 0;")
        p.appendChild(create_element(dom, "strong", label))
        p.appendChild(dom.createTextNode(value))
        left_column_client.appendChild(p)
    content_container.appendChild(left_column_client)

    # Columna derecha: información de la empresa
    right_column_company = create_element(dom, "div", style="flex-basis: 50%; text-align: right; font-size: 10px;")
    company_info = [
        "AMAS Ferretería",
        inp_quote["phoneCompany"],
        inp_quote["addressCompany"],
        inp_quote["idCompany"],
        "amass.com.co"
    ]
    for info in company_info:
        p = create_element(dom, "p", style="margin: 2px 0;")
        p.appendChild(dom.createTextNode(info))
        right_column_company.appendChild(p)
    content_container.appendChild(right_column_company)
    
    main_div.appendChild(content_container)
    return main_div

def create_html_quote(inp_quote, registerType) -> str:
    
    dom = createDOM()
    html = dom.documentElement
    
    head = create_element(dom, "head")
    head.appendChild(create_element(dom, "meta", http_equiv="Content-Type", content="text/html; charset=UTF-8"))
    
    body = create_element(dom, "body", style="font-size: small;")
    css = """
    @media print {
        @page { size: letter; }
    }
    """
    body.appendChild(create_element(dom, "style", css, type="text/css"))
    
    container = create_element(dom, "div", id="containerTable", style="border: solid 1px gray; border-radius: 12px;padding: 1%")
    table = create_element(dom, "table", style="letter-spacing: 1px; font-size: 0.8rem; width: 100%; margin-bottom: 2px")
    
    container.appendChild(create_info_section(dom, inp_quote, stringImageLogo, registerType))

        # Agregar tabla de contenido si existe
    if "content" in inp_quote and isinstance(inp_quote["content"], dict):
        # Reducir el margen superior e inferior para reducir el espacio
        content_table = create_element(dom, "table", style="letter-spacing: 1px; font-size: 0.8rem; width: 100%; margin-top: 0px;")
        
        for key, value in inp_quote["content"].items():
            tr = create_element(dom, "tr")
            th = create_element(dom, "th", key, style="border: 1px solid rgb(190, 190, 190); border-radius: 12px; padding: 2px 4px;background-color: rgb(235, 235, 235); text-align: center; font-size: 10px;") # <-- Cambiado a 10px
            td = create_element(dom, "td", str(value), style="border: 1px solid gray; padding: 5px;border-radius: 12px; text-align: left; font-size: 8px;") # <-- Cambiado a 8px
            tr.appendChild(th)
            tr.appendChild(td)
            content_table.appendChild(tr)
        
        container.appendChild(content_table)
    
    headers = ["Item", "Descripción", "Cant", "P Unitario sin IVA", "IVA Unitario", "P Total"]
    tr = create_element(dom, "tr", style="width: 100%;")
    for header in headers:
        tr.appendChild(create_element(dom, "th", header, style="border: 1px solid rgb(190, 190, 190); border-radius: 12px; padding: 2px 4px;background-color: rgb(235, 235, 235); text-align: center; font-size: 10px;")) # <-- Cambiado a 10px
    thead = create_element(dom, "thead")
    thead.appendChild(tr)
    table.appendChild(thead)
    
    tbody = create_element(dom, "tbody", style="margin-bottom: 200px;")
    total_cost = total_tax_iva = 0
    
    for i, product in enumerate(inp_quote["listProducts"], start=1):
        tr = create_element(dom, "tr")
        quantity = product["quantity"]
        location = product["locations"][0]
        unit_price = location["price"]
        iva_percent = product["IVAPercent"] / 100

        price_without_iva = unit_price / (1 + iva_percent)
        tax_iva = price_without_iva * iva_percent
        total_price = (price_without_iva + tax_iva) * quantity
        
        product_data = [
            str(i),
            product["name"],
            str(quantity),
            f'$ {price_without_iva:,.2f}',
            f'$ {tax_iva:,.2f}',
            f'$ {total_price:,.2f}'
        ]
        
        for data in product_data:
            tr.appendChild(create_element(dom, "td", data, style="border: 1px solid gray; padding: 2px 4px; text-align: center; font-size: 8px;")) # <-- Cambiado a 8px

        total_cost += total_price
        total_tax_iva += tax_iva * quantity
        tbody.appendChild(tr)
    
    trTotal = create_element(dom, "tr")
    trTotal.appendChild(create_element(dom, "td", "Total", colspan="5", style="border: 1px solid gray; padding: 2px 4px; text-align: center; font-size: 8px;")) # <-- Cambiado a 8px
    td_total = create_element(dom, "td", style="border: 1px solid rgb(190, 190, 190); border-radius: 12px; padding: 2px 4px; background-color: rgb(235, 235, 235); text-align: center;")
    strong_total = create_element(dom, "strong", f'$ {total_cost:,.2f}')
    td_total.appendChild(strong_total)
    trTotal.appendChild(td_total)
    tbody.appendChild(trTotal)
    
    table.appendChild(tbody)
    container.appendChild(table)
    
    totals = [
        ("Total Neto:", total_cost - total_tax_iva),
        ("IVA Total:", total_tax_iva),
        ("Total a pagar:", total_cost),
    ]
    
    for label, value in totals:
        # Reducir el margen inferior de los párrafos de totales para compactarlos
        p = create_element(dom, "p", style="margin: 2px 0;")
        p.appendChild(create_element(dom, "strong", label))
        p.appendChild(dom.createTextNode(f'$ {value:,.2f} '))
        container.appendChild(p)

     # Información adicional
    body_divCont = dom.createElement("div")
    
    body_divCont_p1 = dom.createElement("p")
    if inp_quote["type"] == "QUOTE":
        if (((inp_quote["createdAt"] + timedelta(days=3)).date() - datetime.now().date()).days > 0):
            body_divCont_p1.appendChild(dom.createTextNode(f'Validez de la oferta: {((inp_quote["createdAt"] + timedelta(days=3)).date() - datetime.now().date()).days} días'))
            body_divCont_p1.setAttribute("style", "text-align: center; color: green;")
        else:
            body_divCont_p1.appendChild(dom.createTextNode(f'Validez de la oferta: No válida, tiempo de espera superado'))
            body_divCont_p1.setAttribute("style", "text-align: center; color: red;")
        body_divCont.appendChild(body_divCont_p1)
    
        body_divCont_p2 = dom.createElement("p")
        body_divCont_p2.appendChild(dom.createTextNode("Sujeto a verificación de inventario al momento de la facturación."))
        body_divCont_p2.setAttribute("style", "text-align: center;")
        body_divCont.appendChild(body_divCont_p2)
    
    currentDate = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    body_divCont_p3 = dom.createElement("p")
    body_divCont_p3.appendChild(dom.createTextNode(f'Impresión {currentDate}'))
    body_divCont_p3.setAttribute("style", "text-align: center; font-size: 5px;")
    body_divCont_p3.setAttribute("align", "center")
    body_divCont.appendChild(body_divCont_p3)
    container.appendChild(body_divCont)
    body.appendChild(container)
    html.appendChild(head)
    html.appendChild(body)
    
    return dom.toxml()

def pdfOfHtmlText(inpHtmlText, inpPathPdfFile):
    htmldoc = HTML(string=inpHtmlText, base_url="", encoding=str)
    Path(inpPathPdfFile).write_bytes(htmldoc.write_pdf())


if __name__ == "__main__":
    try:
        # arguments 1 = activate function, 2 = url news, 3 =  filePathPdf, 4 = portalNews, 5 = textBody, 6 = titleNews
        # currentTime = str(datetime.now()).replace(" ", "_")
        activeFunction = sys.argv[1]
        strId = sys.argv[2]
        pathPdf = sys.argv[3]
        # local
        mongoUri = "mongodb://localhost:27017/donmario"
        # production
        #mongoUri = "mongodb://amasUser:*AmAsUsErFiRst1@database:27017/amas"
        if activeFunction == OPTIONSPDF["quote"]:
            collection = "quotes"
            objQuote = getRegisterById(strId,mongoUri,"donmario",collection)
            print("objQuote",objQuote)
            strHtml = create_html_quote(objQuote,activeFunction)
            pdfOfHtmlText(strHtml,pathPdf)
        elif activeFunction == OPTIONSPDF["preorder"]:
            collection = "preorders"
            objQuote = getRegisterById(strId,mongoUri,"donmario",collection)
            strHtml = create_html_quote(objQuote,activeFunction)
            pdfOfHtmlText(strHtml,pathPdf)
        elif activeFunction == OPTIONSPDF["order"]:
            collection = "orders"
            objQuote = getRegisterById(strId,mongoUri,"donmario",collection)
            strHtml = create_html_quote(objQuote,activeFunction)
            pdfOfHtmlText(strHtml,pathPdf)
        else:
            print(f"No se ha seleccionado ninguna opción valida {activeFunction}")
            raise Exception(f"No se ha seleccionado ninguna opción valida {activeFunction}")
    except Exception as err:
        raise Exception(err)


"""
python3 -m venv /home/mauro/Documents/virtualEnvs/.mongoamas
pip3 install weasyprint lxml pymongo dnspython pytz
sudo apt install language-pack-es
source /home/mauro/Documents/virtualEnvs/.mongoamas/bin/activate
python3 /home/mauro/Documents/amass/scripts/pythonScripts/htmlStrToPdf.py "pdfOfText" 6748f37b69c2962afee51f77 /home/mauro/Documents/amass/temp/quote.pdf
python3 /home/mauro/Documents/git/amasBackend/scripts/pythonScripts/htmlStrToPdf.py "quote" 6748f37b69c2962afee51f77 /home/mauro/Documents/amass/temp/quote.pdf;
python3 /home/mauro/Documents/git/amasBackend/scripts/pythonScripts/htmlStrToPdf.py "preorder" 675875a9f2682ee9660e6ff3 /home/mauro/Documents/amass/temp/preorder.pdf;
python3 /home/mauro/Documents/git/amasBackend/scripts/pythonScripts/htmlStrToPdf.py "order" 672e61ef86d83329a0f124ef /home/mauro/Documents/amass/temp/order.pdf;

"""
