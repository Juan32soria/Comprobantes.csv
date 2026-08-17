#!/bin/bash
cd "$(dirname "$0")"
python3 procesar_comprobantes.py
read -p "Presiona ENTER para cerrar..."
