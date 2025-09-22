FROM node:20-bullseye AS base

# Actualizar e instalar dependencias de sistema y Python
RUN apt-get update -y \
  && apt-get upgrade -y \
  && apt-get install -y \
  locales locales-all \
  python3-venv python3-pip 

# Crear y activar el entorno virtual de Python
WORKDIR /app
RUN python3 -m venv venv
ENV PATH="/app/venv/bin:$PATH"

# Instalar librerías de Python dentro del entorno virtual
RUN pip install --upgrade pip \
  && pip install pymongo dnspython requests weasyprint==52.5 pytz lxml

# Sigue la construcción de tu aplicación Node.js
# -------------------- Builder --------------------
FROM base AS builder

RUN mkdir -p /home/imagesProducts /home/imagesCategories /home/imagesMarks /home/supportsPayments /home/pdfQuotes /home/pdfOrder /home/files /home/temp /home/scripts/pythonScripts

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY ./src ./src

RUN npm run build

RUN npm prune --production

# -------------------- Release --------------------
FROM base AS release

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copiar el entorno virtual de Python desde la etapa 'base'
COPY --from=base /app/venv /app/venv

USER root

# Variables de entorno
ENV MONGODB_URI=mongodb://amasUser:*AmAsUsErFiRst1@database:27017/amas
ENV URL_ERRFILE=/home/errors.txt
ENV URL_IMAGESPRODUCT=/home/imagesProducts
ENV URL_IMAGESMARKS=/home/imagesMarks
ENV URL_IMAGESCATEGORIES=/home/imagesCategories
ENV URL_SUPPORTPAY=/home/supportsPayments
ENV URL_PDFQUOTES=/home/pdfQuotes
ENV URL_PATH_FILES=/home/files
ENV URL_PATH_TEMP=/home/temp
ENV EMAIL_ALERTS=alertsferreteriaamas@gmail.com
ENV PYTHONSCRIPTS=/home/scripts/pythonScripts
ENV PORT=3500
ENV URL_HOST=https://amass.com.co/api

CMD ["node", "./dist/index.js"]