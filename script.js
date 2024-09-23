document.addEventListener('DOMContentLoaded', function() {
    // Captura de elementos desde el DOM
    const step1 = document.getElementById('step-1');
    const cedulaInput = document.getElementById('cedula');
    const step2 = document.getElementById('step-2');
    const saludo = document.getElementById('saludo'); // Nuevo elemento para el saludo
    const fechaHora = document.getElementById('fecha-hora'); // Elemento separado para la fecha y hora
    const startWorkButton = document.getElementById('start-work');
    const endWorkButton = document.getElementById('end-work');
    const logoutButton = document.getElementById('logout');
    const workLog = document.getElementById('work-log');
    const logContainer = document.getElementById('log-container');
    const breadcrumbStep1 = document.getElementById('step1-breadcrumb');
    const breadcrumbStep2 = document.getElementById('step2-breadcrumb');


// Función para obtener un saludo personalizado dependiendo de la hora del día
function obtenerSaludo(nombre) {
    const now = new Date();
    const hora = now.getHours();
    let saludo = "Buenos días";  // Saludo por defecto

    if (hora >= 12 && hora < 18) {
        saludo = "Buenas tardes";
    } else if (hora >= 18) {
        saludo = "Buenas noches";
    }

    console.log(`Saludo generado: ${saludo}, ${nombre}`); // Depuración
    return `${saludo}, ${nombre}`;
}

 // Función para mostrar la fecha y la hora actuales en el elemento correcto
 function showDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('es-ES', options);
    const timeString = now.toLocaleTimeString('es-ES');
    fechaHora.textContent = `Fecha: ${dateString}, Hora: ${timeString}`; // Mostrar la fecha y hora
}

// Función para registrar las entradas y salidas
function logWork(cedula, accion, hora, fecha) {
    const workLog = document.getElementById('work-log');

    // Verificación adicional para asegurarse de que el contenedor está presente
    if (!workLog) {
        console.error('El elemento #work-log no se encontró en el DOM.');
        alert('Error interno: No se pudo registrar la entrada o salida. Por favor, verifica la configuración.');
        return;
    }

    // Crear un nuevo elemento de lista con la información de la entrada o salida
    const logItem = document.createElement('li');
    logItem.textContent = `Cédula: ${cedula}, Acción: ${accion}, Fecha: ${fecha}, Hora: ${hora}`;
    workLog.appendChild(logItem);

    // Confirmar en la consola que el registro se ha añadido
    console.log(`Registro añadido: Cédula: ${cedula}, Acción: ${accion}, Fecha: ${fecha}, Hora: ${hora}`);
}


// Mostrar saludo personalizado al acceder al paso 2
step1.addEventListener('submit', async function (e) {
    e.preventDefault();
    const cedula = cedulaInput.value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula })
        });

        const data = await response.json();

        if (response.ok) {
            const nombre = data.employee.nombre;

            // Forzar la visibilidad y estilos del saludo
            saludo.style.display = 'block';
            saludo.style.visibility = 'visible';
            saludo.style.color = 'black';
            saludo.style.fontSize = '16px';

            // Actualiza el saludo
            setTimeout(() => {
                saludo.textContent = obtenerSaludo(nombre);
                console.log(`Actualizando saludo: ${saludo.textContent}`); // Depuración
            }, 100);

            // Mostrar el paso 2
            breadcrumbStep1.style.display = 'none';
            breadcrumbStep2.style.display = 'inline-block';
            logContainer.style.display = 'block';
            step1.style.display = 'none';
            step2.style.display = 'block';
            showDateTime();

            // Mostrar los registros de días anteriores
            await mostrarRegistrosAnteriores(cedula);

            // Verificar si hay un registro de entrada hoy y mostrar los botones adecuados
            await verificarRegistroHoy(cedula);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud.');
    }
});

// Función para obtener y mostrar los registros de días anteriores
async function mostrarRegistrosAnteriores(cedula) {
    try {
        const response = await fetch('/api/get_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula })
        });

        const data = await response.json();
        console.log('Respuesta completa del servidor:', data); // Depuración para revisar la estructura de la respuesta

        // Verifica que la respuesta contenga registros y que sea un array
        if (data.status === 'success' && Array.isArray(data.registros)) {
            const workLog = document.getElementById('work-log');
            const tableBody = document.getElementById('total-hours-table-body');
            workLog.innerHTML = '';  // Limpia los registros anteriores
            tableBody.innerHTML = ''; // Limpia los totales anteriores

            // Verifica si hay registros para mostrar
            if (data.registros.length > 0) {
                data.registros.forEach(log => {
                    // Mostrar solo los registros de entrada y salida en `work-log`
                    if (log.tipo === 'entrada' || log.tipo === 'salida') {
                        const logItem = document.createElement('li');
                        logItem.textContent = `Fecha: ${log.fecha}, ${log.tipo === 'entrada' ? 'Hora entrada' : 'Hora salida'}: ${log.hora}`;
                        workLog.appendChild(logItem);
                    }
                });

                // Mostrar el total de horas trabajadas en la tabla de totales
                if (data.total_trabajado) {
                    insertarFilaTotalHoras(data.registros[0].fecha, data.total_trabajado, tableBody);
                }
            } else {
                alert('No hay registros disponibles para mostrar.');
            }
        } else {
            console.error('Error: los registros no se recibieron correctamente.');
            alert(data.message || 'Error al procesar los registros.');
        }
    } catch (error) {
        console.error('Error al obtener registros anteriores:', error);
        alert('Error al obtener registros anteriores.');
    }
}

// Función para insertar una fila en la tabla de totales de horas trabajadas
function insertarFilaTotalHoras(fecha, totalTrabajado, tableBody) {
    const row = tableBody.insertRow();
    const [horas, minutos] = totalTrabajado.match(/\d+/g); // Extrae las horas y minutos del string
    row.insertCell(0).textContent = fecha;
    row.insertCell(1).textContent = horas;
    row.insertCell(2).textContent = minutos;
   }

   // Función para verificar si ya hay un registro de entrada hoy y mostrar botones
async function verificarRegistroHoy(cedula) {
    try {
        const response = await fetch('/api/check_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula })
        });

        const data = await response.json();
        console.log('Respuesta completa del servidor:', JSON.stringify(data, null, 2)); // Log para revisar la respuesta

        if (data.status === 'success') {
            const tipoRegistro = data.ultimo_registro; // 'entrada', 'salida', o 'none'

            // Ajustar los botones según el último registro
            if (tipoRegistro === 'entrada') {
                startWorkButton.style.display = 'none';
                endWorkButton.style.display = 'inline-block'; // Mostrar botón de salida
            } else if (tipoRegistro === 'salida' || tipoRegistro === 'none') {
                startWorkButton.style.display = 'inline-block'; // Mostrar botón de entrada
                endWorkButton.style.display = 'none';
            }
        } else {
            console.error('Error en la respuesta del servidor:', data.message);
            alert('Error al verificar entrada: ' + data.message);
        }
    } catch (error) {
        console.error('Error al verificar entrada hoy:', error);
        alert('Error al verificar entrada: ' + error.message);
    }
}
     

 // Función para verificar si ya hay un registro de entrada y salida hoy y ajustar los botones
 async function verificarRegistroHoy(cedula) {
    try {
        const response = await fetch('/api/check_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula })
        });

        const data = await response.json();
        console.log('Respuesta completa del servidor:', JSON.stringify(data, null, 2)); // Log para revisar la respuesta

        if (data.status === 'success') {
            const registroHoy = data.registroHoy;
            const ultimoRegistro = data.ultimo_registro; // 'entrada' o 'salida'



            // Ajustar los botones según el último registro
            if (ultimoRegistro === 'entrada') {
                startWorkButton.style.display = 'none';
                endWorkButton.style.display = 'inline-block'; // Mostrar botón de salida
            } else if (ultimoRegistro === 'salida') {
                startWorkButton.style.display = 'inline-block'; // Mostrar botón de entrada
                endWorkButton.style.display = 'none';
            } else {
                // Caso por defecto si no hay registros previos
                startWorkButton.style.display = 'inline-block';
                endWorkButton.style.display = 'none';
            }
        } else {
            console.error('Error en la respuesta del servidor:', data.message);
            startWorkButton.style.display = 'inline-block';
            endWorkButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al verificar entrada hoy:', error);
        alert('Error al verificar entrada: ' + error.message);
    }
}

  // Manejo del botón de entrada
  startWorkButton.addEventListener('click', async function () {
    const cedula = cedulaInput.value;

    try {
        const response = await fetch('/api/log_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula, tipo: 'entrada' })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message);

            const now = new Date();
            const fecha = now.toLocaleDateString('es-ES');
            const hora = now.toLocaleTimeString('es-ES');

            logWork(cedula, 'Entrada', hora, fecha);
            startWorkButton.style.display = 'none';
            endWorkButton.style.display = 'inline-block';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error al marcar entrada:', error);
        alert('Error al marcar entrada.');
    }
});

   // Manejo del botón de salida
   endWorkButton.addEventListener('click', async function () {
    const cedula = cedulaInput.value;

    try {
        const response = await fetch('/api/log_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula, tipo: 'salida' })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message);

            const now = new Date();
            const fecha = now.toLocaleDateString('es-ES');
            const hora = now.toLocaleTimeString('es-ES');

            logWork(cedula, 'Salida', hora, fecha);
            startWorkButton.style.display = 'inline-block';
            endWorkButton.style.display = 'none';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error al marcar salida:', error);
        alert('Error al marcar salida.');
    }
});

// Función para imprimir las horas de entrada y salida con la fecha
function imprimirHora(tipoHora, hora, fecha) {
    const logItem = document.createElement('li');
    logItem.textContent = `Fecha: ${fecha}, ${tipoHora}: ${hora}`;
    document.getElementById('work-log').appendChild(logItem);
}
// Función para imprimir el total de horas trabajadas
function imprimirTotalHoras(fecha, totalTrabajado) {
    const logItem = document.createElement('li');
    logItem.style.fontWeight = 'bold'; // Resaltar el total de horas trabajadas
    logItem.textContent = `Fecha: ${fecha}, Total horas trabajadas: ${totalTrabajado}`;
    document.getElementById('work-log').appendChild(logItem);
}

// Función para reiniciar al paso 1
function resetToStep1() {
    step2.style.display = 'none';
    step1.style.display = 'block';
    breadcrumbStep1.style.display = 'inline-block';
    breadcrumbStep2.style.display = 'none';
    logContainer.style.display = 'none';
}

// Función para salir de la sesión sin marcar
logoutButton.addEventListener('click', function () {
    resetToStep1(); // Reiniciar al paso 1
        // Resetea los campos y cualquier mensaje de error si es necesario
        document.getElementById('cedula').value = ''; // Limpia el campo de cédula
        // Aquí puedes resetear más campos o estados si es necesario
                // Recarga la página para reiniciar completamente
                location.reload();
});
});
