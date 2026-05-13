# Planeamiento Parser → Comic Creator 📋

PWA que extrae los elementos AOA clave de un planeamiento MEDUCA y los envía pre-llenados al Comic Creator.

## Flujo de trabajo
1. Sube tu planeamiento (.docx, .pdf, .txt) o pega el texto
2. La IA (DeepSeek) extrae: topic, vocabulary, target structure, function, hook, outcome
3. Ajustas grade y AOA phase
4. Tap "Open in Comic Creator" → abre la app con todos los campos pre-llenados
5. Generas la historia y construyes el cómic

## Deploy en Vercel

### 1. Variables de entorno
En Vercel → Settings → Environment Variables:
```
DEEPSEEK_API_KEY = sk-xxxxxxxxxxxxxxxx
```

### 2. Deploy
Conecta el repo en vercel.com — deploy automático.

## Estructura
```
plan-parser/
├── index.html       # App PWA
├── manifest.json
├── vercel.json
├── api/
│   └── parse.js     # Serverless → DeepSeek
└── js/
    └── app.js       # Lógica: file reading, display, URL params
```

---
Para CEBG Barrigón, Panamá 🇵🇦
