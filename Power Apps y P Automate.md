Flows:



Duplicados+NOrden

URL: https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b62c3d4b21d24bda8daa75a8586198eb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4nqPljifCY1CBxAiKj03La2YEksNn78meKn9-nlXGCk


1.Request (trigger)
{

&#x20; "type": "Request",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "triggerAuthenticationType": "All",

&#x20;   "schema": {

&#x20;     "kind": "Http",

&#x20;     "inputs": {

&#x20;       "schema": {

&#x20;         "type": "object",

&#x20;         "properties": {

&#x20;           "nombre": {

&#x20;             "type": "string"

&#x20;           },

&#x20;           "apellidos": {

&#x20;             "type": "string"

&#x20;           },

&#x20;           "dni": {

&#x20;             "type": "string"

&#x20;           },

&#x20;           "especialidad": {

&#x20;             "type": "string"

&#x20;           },

&#x20;           "tipoEnsenanza": {

&#x20;             "type": "string"

&#x20;           },

&#x20;           "curso": {

&#x20;             "type": "string"

&#x20;           }

&#x20;         }

&#x20;       },

&#x20;       "triggerAuthenticationType": "All"

&#x20;     }

&#x20;   }

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "d9b953cf-00ac-4e2a-b40a-d8acb07cd344"

&#x20; }

}



2. Inicializar variable
{

&#x20; "type": "InitializeVariable",

&#x20; "inputs": {

&#x20;   "variables": \[

&#x20;     {

&#x20;       "name": "EnsenanzaCurso",

&#x20;       "type": "string",

&#x20;       "value": "@{concat(if(equals(triggerBody()?\['tipoEnsenanza'],'elemental'),'EE','EP'), replace(replace(replace(replace(replace(replace(triggerBody()?\['curso'],'1º','1'),'2º','2'),'3º','3'),'4º','4'),'5º','5'),'6º','6'))}"

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "runAfter": {},

&#x20; "metadata": {

&#x20;   "operationMetadataId": "3d947170-5a98-4e3b-b209-7dca41aeca21"

&#x20; }

}



3.Enumerar filas
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "cpmmr_matriculas",
      "$select": "cpmmr_matriculaid",
      "$filter": "\tcpmmr_dni eq '@{triggerBody()?['dni']}' and cpmmr_especialidad eq '@{triggerBody()?['especialidad']}' and cpmmr_ensenanzaycurso eq '@{variables('EnsenanzaCurso')}'",
      "$top": 1
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
      "connection": "shared_commondataserviceforapps",
      "operationId": "ListRecords"
    }
  },
  "runAfter": {
    "Inicializar_variable": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "89a04fe8-2c85-4a47-a26c-866d97da8c58"
  }
}





5. Condition: length(body('Enumerar\_filas')?\['value'])is greather than 0

5.1. True:{

&#x20; "type": "Response",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "statusCode": 409,

&#x20;   "headers": {

&#x20;     "Content-Type": "application/json"

&#x20;   },

&#x20;   "body": {

&#x20;     "ok": false,

&#x20;     "reason": "duplicate",

&#x20;     "contact": {

&#x20;       "phone": "926 274 154",

&#x20;       "email": "13004341.cpm@educastillalamancha.es"

&#x20;     }

&#x20;   }

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "f0450195-07e4-4705-87e8-a67567945b18"

&#x20; }

}



5.2. False

5.2.1. Enumerar filas 2
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "cpmmr_matriculas",
      "$select": "cpmmr_matriculaid",
      "$top": 500
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
      "connection": "shared_commondataserviceforapps",
      "operationId": "ListRecords"
    }
  }
}

5.2.2. Respuesta 2
{
  "type": "Response",
  "kind": "Http",
  "inputs": {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "ok": true,
      "requestNumber": "@{concat('2026-2027-', string(add(length(body('Enumerar_filas_2')?['value']), 1)))}"
    }
  },
  "runAfter": {
    "Enumerar_filas_2": [
      "Succeeded"
    ]
  }
}

===========================================================================================================
JSON con PDF

URL: https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b31521c981d04d95a8a6917a899f3988/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i6YvgMW9GNJO-1Ynz0A3hAiNPGvZVpXkzbsdoeBYsfU

1.Request (trigger)
{

&#x20; "type": "Request",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "triggerAuthenticationType": "All",

&#x20;   "schema": {

&#x20;     "type": "object",

&#x20;     "properties": {

&#x20;       "rowId": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "fileName": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "mimeType": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "contentBase64": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "nombre": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "apellidos": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "email": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tipoCurso": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "especialidad": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente1": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente2": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "perfil": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "formaPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "reduccion": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importeTotal": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe1erPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe2oPago": {

&#x20;         "type": "string"

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "5006a095-d9e3-4734-a9ab-7e76c54c35af"

&#x20; }

}



2.{

&#x20; "type": "Request",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "triggerAuthenticationType": "All",

&#x20;   "schema": {

&#x20;     "type": "object",

&#x20;     "properties": {

&#x20;       "rowId": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "fileName": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "mimeType": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "contentBase64": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "nombre": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "apellidos": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "email": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tipoCurso": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "especialidad": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente1": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente2": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "perfil": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "formaPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "reduccion": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importeTotal": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe1erPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe2oPago": {

&#x20;         "type": "string"

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "5006a095-d9e3-4734-a9ab-7e76c54c35af"

&#x20; }

}



3.{

&#x20; "type": "OpenApiConnection",

&#x20; "inputs": {

&#x20;   "parameters": {

&#x20;     "entityName": "cpmmr\_matriculas",

&#x20;     "recordId": "@triggerBody()?\['rowId']"

&#x20;   },

&#x20;   "host": {

&#x20;     "apiId": "/providers/Microsoft.PowerApps/apis/shared\_commondataserviceforapps",

&#x20;     "connection": "shared\_commondataserviceforapps",

&#x20;     "operationId": "GetItem"

&#x20;   }

&#x20; },

&#x20; "runAfter": {

&#x20;   "Cargar\_un\_archivo\_o\_una\_imagen": \[

&#x20;     "Succeeded"

&#x20;   ]

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "0888a9d9-e979-4015-af33-aca728fef7dd"

&#x20; }

}



4\. {

&#x20; "type": "OpenApiConnection",

&#x20; "inputs": {

&#x20;   "parameters": {

&#x20;     "emailMessage/To": "@triggerBody()?\['email']\\r\\n",

&#x20;     "emailMessage/Subject": "Solicitud de matrícula RECIBIDA — CPM Marcos Redondo (Ciudad Real)\\n",

&#x20;     "emailMessage/Body": "<div style=\\"font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:680px;margin:0 auto\\">\\n\\n  <!-- Cabecera -->\\n  <div style=\\"background:#1e40af;padding:20px 24px;border-radius:8px 8px 0 0\\">\\n    <p style=\\"color:#ffffff;font-size:18px;font-weight:bold;margin:0\\">\\n      Conservatorio Profesional de Música \\"Marcos Redondo\\"\\n    </p>\\n    <p style=\\"color:#bfdbfe;font-size:13px;margin:4px 0 0\\">Ciudad Real</p>\\n  </div>\\n\\n  <!-- Mensaje principal -->\\n  <div style=\\"background:#f0fdf4;border:1px solid #86efac;padding:16px 24px;margin:0\\">\\n    <p style=\\"margin:0;font-size:15px\\">\\n      ✅ Estimado/a <b>@{triggerBody()?\['nombre']} @{triggerBody()?\['apellidos']}</b>,\\n    </p>\\n    <p style=\\"margin:8px 0 0;color:#166534\\">\\n      Hemos recibido correctamente tu solicitud de matrícula. A continuación tienes el resumen de los datos enviados. Consérvalo como justificante.\\n    </p>\\n  </div>\\n\\n  <!-- DATOS PERSONALES -->\\n  <div style=\\"padding:16px 24px 0\\">\\n    <p style=\\"font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px\\">\\n      Datos Personales\\n    </p>\\n    <table style=\\"width:100%;border-collapse:collapse;font-size:13px\\">\\n      <tbody><tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280;width:40%\\">Nombre y apellidos</td>\\n        <td style=\\"padding:6px 8px;font-weight:bold\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_nombre']} @{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_apellidos']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">DNI / NIE</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_dni']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Fecha de nacimiento</td>\\n        <td style=\\"padding:6px 8px\\">@{formatDateTime(outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_fechanacimiento'], 'dd-MM-yyyy')}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Domicilio</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_domicilio']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Localidad</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_localidad']} (@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_provincia']}) — CP @{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_cp']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Email</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_email']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Teléfono</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_telefono']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Hora salida estudios</td>\\n        <td style=\\"padding:6px 8px\\">@{outputs('Get\_a\_row\_by\_ID')?\['body/cpmmr\_horasalida']}</td>\\n      </tr>\\n    </tbody></table>\\n  </div>\\n\\n  <!-- DATOS DE MATRÍCULA -->\\n  <div style=\\"padding:16px 24px 0\\">\\n    <p style=\\"font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px\\">\\n      Datos de Matriculación\\n    </p>\\n    <table style=\\"width:100%;border-collapse:collapse;font-size:13px\\">\\n      <tbody><tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280;width:40%\\">Tipo / Curso</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['tipoCurso']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Especialidad</td>\\n        <td style=\\"padding:6px 8px;font-weight:bold\\">@{triggerBody()?\['especialidad']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Asignatura pendiente 1</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['asignaturaPendiente1']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Asignatura pendiente 2</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['asignaturaPendiente2']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Perfil profesional</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['perfil']}</td>\\n      </tr>\\n    </tbody></table>\\n  </div>\\n\\n  <!-- FORMA DE PAGO -->\\n  <div style=\\"padding:16px 24px 0\\">\\n    <p style=\\"font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:10px\\">\\n      Forma de Pago\\n    </p>\\n    <table style=\\"width:100%;border-collapse:collapse;font-size:13px\\">\\n      <tbody><tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280;width:40%\\">Modalidad</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['formaPago']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Reducción aplicada</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['reduccion']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">Importe total</td>\\n        <td style=\\"padding:6px 8px;font-weight:bold;font-size:15px\\">@{triggerBody()?\['importeTotal']}</td>\\n      </tr>\\n      <tr style=\\"background:#f9fafb\\">\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">1er pago</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['importe1erPago']}</td>\\n      </tr>\\n      <tr>\\n        <td style=\\"padding:6px 8px;color:#6b7280\\">2º pago</td>\\n        <td style=\\"padding:6px 8px\\">@{triggerBody()?\['importe2oPago']}</td>\\n      </tr>\\n    </tbody></table>\\n  </div>\\n\\n  <!-- Pie -->\\n  <div style=\\"background:#f3f4f6;padding:16px 24px;margin-top:20px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;font-size:12px;color:#6b7280\\">\\n    <p style=\\"margin:0\\">Si tienes cualquier duda, puedes contactarnos en:</p>\\n    <p style=\\"margin:6px 0 0\\">📞 <b>926 27 41 54</b> \&nbsp;|\&nbsp; ✉️ <a href=\\"mailto:13004341.cpm@educastillalamancha.es\\" style=\\"color:#1e40af\\">13004341.cpm@educastillalamancha.es</a></p>\\n    <p style=\\"margin:10px 0 0\\">Un saludo,<br><b>Secretaría del CPM \\"Marcos Redondo\\"</b> — Ciudad Real</p>\\n  </div>\\n\\n</div>",

&#x20;     "emailMessage/From": "13004341.cpm@educastillalamancha.es"

&#x20;   },

&#x20;   "host": {

&#x20;     "apiId": "/providers/Microsoft.PowerApps/apis/shared\_office365",

&#x20;     "connection": "shared\_office365",

&#x20;     "operationId": "SendEmailV2"

&#x20;   }

&#x20; },

&#x20; "runAfter": {

&#x20;   "Get\_a\_row\_by\_ID": \[

&#x20;     "Succeeded"

&#x20;   ]

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "e4de44c4-0667-4aa3-a9f0-cd94a0d203af"

&#x20; }

}



5.{

&#x20; "type": "Response",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "statusCode": 200,

&#x20;   "headers": {

&#x20;     "content-Type": "application/json"

&#x20;   }

&#x20; },

&#x20; "runAfter": {

&#x20;   "Enviar\_correo\_electrónico\_(V2)": \[

&#x20;     "Succeeded"

&#x20;   ]

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "51dac5ed-9041-4748-a88d-e8751047a609"

&#x20; }

}


====================================================================================================================
JSON con todos los datos

URL: https://c627b3c984dee98bb3d3cffe8c91c0.4d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ec7a2a1c67974d32ba23de811d20e93d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3G39Rx3ZC55SKVIoBGvRufw-d6J6fYl74GOi46We9f0



1.Request (trigger)
{

&#x20; "type": "Request",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "triggerAuthenticationType": "All",

&#x20;   "schema": {

&#x20;     "type": "object",

&#x20;     "properties": {

&#x20;       "nombre": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "apellidos": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "dni": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "fechaNacimiento": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "domicilio": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "localidad": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "provincia": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "codigoPostal": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "email": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "telefono": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "horaSalidaEstudios": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "disponibilidadManana": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "autorizacionImagen": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "tutor1Nombre": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tutor1Dni": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tutor2Nombre": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tutor2Dni": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "tipoEnsenanza": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "curso": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "ensenanzaCurso": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "especialidad": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente1": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "asignaturaPendiente2": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "perfilProfesional": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "formaPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "familiaNumerosa": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "tipoReduccion": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "convalidacionSolicitada": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "convalidacionAsignaturas": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "matriculaHonor": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "esPrimerAno": {

&#x20;         "type": "boolean"

&#x20;       },

&#x20;       "importeTotal": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe1erPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "importe2oPago": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "nOrden": {

&#x20;         "type": "string"

&#x20;       },

&#x20;       "estado": {

&#x20;         "type": "string"

&#x20;       }

&#x20;     }

&#x20;   }

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "2f12d8a8-58b3-498c-a670-d204086f3451"

&#x20; }

}



2.{

&#x20; "type": "InitializeVariable",

&#x20; "inputs": {

&#x20;   "variables": \[

&#x20;     {

&#x20;       "name": "EnsenanzaCurso",

&#x20;       "type": "string",

&#x20;       "value": "concat(\\n  if(equals(triggerBody()?\['tipoEnsenanza'], 'elemental'), 'EE', 'EP'),\\n  replace(replace(replace(replace(replace(replace(\\n    triggerBody()?\['curso'],\\n  '1º','1'),'2º','2'),'3º','3'),'4º','4'),'5º','5'),'6º','6')\\n)"

&#x20;     }

&#x20;   ]

&#x20; },

&#x20; "runAfter": {},

&#x20; "metadata": {

&#x20;   "operationMetadataId": "af02b414-88da-4602-bae5-b96fdd759dcd"

&#x20; }

}



3.{

&#x20; "type": "OpenApiConnection",

&#x20; "inputs": {

&#x20;   "parameters": {

&#x20;     "entityName": "cpmmr\_matriculas",

&#x20;     "x-ms-odata-metadata-full": true,

&#x20;     "item/cpmmr\_apellidos": "@triggerBody()?\['apellidos']",

&#x20;     "item/cpmmr\_autorizacionimagen": "@triggerBody()?\['autorizacionImagen']",

&#x20;     "item/cr955\_convalidacionasignaturas": "@triggerBody()?\['convalidacionAsignaturas']",

&#x20;     "item/cr955\_convalidacionsolicitada": "@triggerBody()?\['convalidacionSolicitada']",

&#x20;     "item/cpmmr\_cp": "@triggerBody()?\['codigoPostal']",

&#x20;     "item/cpmmr\_disponibilidadmanana": "@triggerBody()?\['disponibilidadManana']",

&#x20;     "item/cpmmr\_dni": "@triggerBody()?\['dni']",

&#x20;     "item/cpmmr\_domicilio": "@triggerBody()?\['domicilio']",

&#x20;     "item/cpmmr\_email": "@triggerBody()?\['email']",

&#x20;     "item/cpmmr\_ensenanzaycurso": "@triggerBody()?\['ensenanzaCurso']\\r\\n",

&#x20;     "item/cpmmr\_especialidad": "@triggerBody()?\['especialidad']",

&#x20;     "item/cpmmr\_fechanacimiento": "@triggerBody()?\['fechaNacimiento']",

&#x20;     "item/cpmmr\_formadepago": "@triggerBody()?\['formaPago']",

&#x20;     "item/cpmmr\_horasalida": "@triggerBody()?\['horaSalidaEstudios']",

&#x20;     "item/cpmmr\_localidad": "@triggerBody()?\['localidad']",

&#x20;     "item/cpmmr\_nombre": "@triggerBody()?\['nombre']",

&#x20;     "item/cpmmr\_provincia": "@triggerBody()?\['provincia']",

&#x20;     "item/cpmmr\_reducciontasas": "@triggerBody()?\['tipoReduccion']",

&#x20;     "item/cpmmr\_telefono": "@triggerBody()?\['telefono']"

&#x20;   },

&#x20;   "host": {

&#x20;     "apiId": "/providers/Microsoft.PowerApps/apis/shared\_commondataserviceforapps",

&#x20;     "connection": "shared\_commondataserviceforapps",

&#x20;     "operationId": "CreateRecord"

&#x20;   }

&#x20; },

&#x20; "runAfter": {

&#x20;   "Inicializar\_variable": \[

&#x20;     "Succeeded"

&#x20;   ]

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "3b052bbb-f06e-4d13-8dc1-1f3adcbea36d"

&#x20; }

}



4.{

&#x20; "type": "Response",

&#x20; "kind": "Http",

&#x20; "inputs": {

&#x20;   "statusCode": 200,

&#x20;   "headers": {

&#x20;     "Content-Type": "application/json"

&#x20;   },

&#x20;   "body": {

&#x20;     "rowId": "@{outputs('Dataverse')?\['body/cpmmr\_matriculaid']}"

&#x20;   }

&#x20; },

&#x20; "runAfter": {

&#x20;   "Dataverse": \[

&#x20;     "Succeeded"

&#x20;   ]

&#x20; },

&#x20; "metadata": {

&#x20;   "operationMetadataId": "d77c55f4-ba7c-4e22-a4d4-57ac2ebcd077"

&#x20; }

}







TABLAS================================================



Matrícula Asignatura (cr955\_matriculaasignatura)--------------------



Nombre				Tipo de datos

cr955\_CodigoMateria		Línea de texto única



cr955\_EstadoAsignatura		Opción



cr955\_Matricula			Búsqueda



cr955\_MatriculaAsignatura	Identificador unico



cr955\_Name			Línea de texto única



cr955\_NOrden			Número entero





Solicitudes de Matrículas (cpmmr\_matricula)----------------





Nombre				Tipo de datos

cpmmr\_Apellidos			Línea de texto única



cpmmr\_Autorizacionlmagen	Sí/No



cpmmr\_CP			Línea de texto única



cpmmr\_DisponibilidadManana	Sí/No



cpmmr\_DNI			Línea de texto única



cpmmr\_DocFaltante		Area de texto



cpmmr\_Domicilio			Línea de texto única



cpmmr\_Email			Correo electrónico



cpmmr\_EnsenanzayCurso		Línea de texto única



cpmmr\_Especialidad		Línea de texto única



cpmmr\_Estado			Opción



cpmmr\_Fechadelnscripcion	Solo fecha



cpmmr\_FechaNacimiento		Solo fecha



cpmmr\_FormadePago		Línea de texto única



cpmmr\_HoraSalida		Línea de texto unica



cpmmr\_Localidad			Línea de texto única



**cpmmr\_Matriculald		Identificador único**



cpmmr\_Nombre			Línea de texto única



cpmmr\_NombreMatricula		Linea de texto unica



cpmmr\_Provincia			Línea de texto única



cpmmr\_ReduccionTasas		Línea de texto única



cpmmr\_solicitudPDF		Archivo



cpmmr\_Telefono			Numero de telefono



cr955\_convalidacionasignaturas	Varias líneas de texto



cr955\_convalidacionsolicitada	Sí/No



cr955\_docfaltante		Línea de texto única



cr955\_NOrden			Número entero





