from mainFunctions import conectionMongo, sendEmail
import datetime
import sys

def createListContent(inpBackDays: int,inpUri,inpDb, inpColl):
    collection = conectionMongo(inpUri,inpDb,inpColl)
    # Calcular la fecha actual menos 3 días
    dateBackNDays = datetime.datetime.now().date() - datetime.timedelta(days=int(inpBackDays))

    listStrContent = []
    for elem in collection.find({"$and":[{"dateOrder": {"$gte": str(dateBackNDays),"$lt": str(dateBackNDays + datetime.timedelta(days=1))}}, {"type": "QUOTE"}]}):
        #print(elem['dateOrder'])
        listStrContent.append(f"{elem['clientNames']} {elem['clientLastnames']}, cotización {elem['idQuote']}  <a style='text-decoration: none; border-radius: 5px; padding: 11px 23px; color:white;font-size: 17px; background-color:#3498db' href='https://amass.com.co/orders/quote/{elem['_id']}'>Detalle</a>")
    return listStrContent

if __name__ == "__main__":
    uri = "mongodb://amasUser:*AmAsUsErFiRst1@localhost:27017/amas"
    #uri = "localhost"
    db = "amas"
    coll = "quotes"
    backDays = sys.argv[1]
    pathLogoImage = sys.argv[2]
    listStrContent = createListContent(backDays,uri,db,coll)
    #print(listStrContent)
    if (len(listStrContent) > 0):
        sendEmail('no-reply@amass.com.co','aX(b^Po(w7EF','smtp.amass.com.co',['ninefoxfire9@gmail.com','alerts@amass.com.co'],587,pathLogoImage,'Cotizaciones por vencer',f'Cotizaciones que vencen {str(datetime.datetime.now().date())}',listStrContent)


# python3 /home/mauro/Documents/git/amasBackend/scripts/pythonScripts/alertExperation.py 6 /home/mauro/Documents/amass/files/images/ImagenLogoAmass.png
