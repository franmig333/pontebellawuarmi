exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Obtener variables de entorno configuradas en Netlify
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'franmig333';
    const repo = process.env.GITHUB_REPO || 'bio-site-mc';
    const path = 'data.json';
    
    if (!token) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'GITHUB_TOKEN no está configurado en Netlify' }) 
      };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Paso 1: Obtener el sha actual del archivo data.json
    let sha = null;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Netlify-Function'
        }
      });

      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }
    } catch (getErr) {
      console.log('Archivo nuevo o error al obtener SHA', getErr);
    }

    // Paso 2: Convertir los nuevos datos a Base64 (UTF-8 seguro con Buffer nativo de Node.js)
    const jsonString = JSON.stringify(data, null, 2);
    const base64Content = Buffer.from(jsonString, 'utf-8').toString('base64');

    // Paso 3: Hacer un PUT para sobrescribir el archivo en el repositorio
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Function'
      },
      body: JSON.stringify({
        message: 'Actualización de contenido desde Dashboard via Netlify Function',
        content: base64Content,
        sha: sha
      })
    });

    if (!putRes.ok) {
        const errorText = await putRes.text();
        console.error("Error de la API de GitHub:", errorText);
        return { 
          statusCode: putRes.status, 
          body: JSON.stringify({ error: 'Fallo al guardar en GitHub', details: errorText }) 
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Datos guardados exitosamente.' })
    };

  } catch (error) {
    console.error('Error en saveData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor.' })
    };
  }
};
