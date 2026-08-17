#!/bin/bash
cd "$(dirname "$0")"
echo "===================================================="
echo "  Instalación del sistema de comprobantes (una vez)"
echo "===================================================="
echo ""
python3 -m pip install --upgrade google-genai pillow openpyxl
echo ""
echo "Si arriba no apareció ningún error, la instalación terminó bien."
echo "Siguiente paso: abrir config.txt y pegar la clave de API."
echo ""
read -p "Presiona ENTER para cerrar..."
