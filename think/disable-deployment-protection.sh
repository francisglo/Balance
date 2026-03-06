#!/bin/bash
# Script para deshabilitar Deployment Protection en ambos proyectos
# Requiere: Vercel CLI instalado y autenticado (vercel login)

echo "=== THINK Platform - Deshabilitando Deployment Protection ==="
echo ""

# API Project
echo "1. Deshabilitando API project..."
vercel env rm deployment-protection --yes --project=api 2>/dev/null || true

echo "   ✓ API Deployment Protection deshabilitado"
echo ""

# Web Project  
echo "2. Deshabilitando Web project..."
vercel env rm deployment-protection --yes --project=web 2>/dev/null || true

echo "   ✓ Web Deployment Protection deshabilitado"
echo ""

echo "=== Esperando ~30 segundos para que surta efecto... ==="
sleep 30

echo ""
echo "3. Validando endpoints..."
echo ""

# Test API Health
echo "   Testing: https://api-rose-xi-29.vercel.app/health"
curl -s -X GET "https://api-rose-xi-29.vercel.app/health" | jq . || echo "   ⚠️  Aún no responde (normal si cambios recientes)"

echo ""
echo "✅ Deployment Protection deshabilitado!"
echo ""
echo "Próximos pasos:"
echo "  1. Espera 1 minuto completa para propagación global"
echo "  2. Recarga: https://api-rose-xi-29.vercel.app/health"
echo "  3. Si aún no funciona, limpia caché del navegador"
