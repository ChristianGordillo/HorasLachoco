from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///employees.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Definición de los modelos
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cedula = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    registro_horas = db.relationship('RegistroHora', backref='employee', lazy=True)

class RegistroHora(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(10), nullable=False)  # "entrada" o "salida"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)

def create_tables():
    with app.app_context():
        db.create_all()

# Ruta para añadir un nuevo empleado
@app.route('/api/add_employee', methods=['POST'])
def add_employee():
    try:
        # Obtener los datos del empleado desde la solicitud
        data = request.json
        cedula = data.get('cedula')
        nombre = data.get('nombre')
        apellido = data.get('apellido')

        # Verificar que los datos necesarios están presentes
        if not cedula or not nombre or not apellido:
            return jsonify({"status": "fail", "message": "Cédula, nombre y apellido son requeridos."}), 400

        # Comprobar si el empleado ya existe
        if Employee.query.filter_by(cedula=cedula).first():
            return jsonify({"status": "fail", "message": "El empleado ya existe."}), 400

        # Crear un nuevo empleado
        new_employee = Employee(cedula=cedula, nombre=nombre, apellido=apellido)

        # Agregar y confirmar en la base de datos
        db.session.add(new_employee)
        db.session.commit()

        return jsonify({"status": "success", "message": "Empleado añadido con éxito."}), 201

    except Exception as e:
        print(f"Error al añadir empleado: {e}")
        return jsonify({"status": "fail", "message": "Error en el servidor."}), 500

# Ruta principal para la página de inicio
@app.route('/')
def index():
    return render_template('index.html')

# Ruta para verificar la cédula del empleado
@app.route('/api/login', methods=['POST'])
def login():
    try:
        cedula = request.json.get('cedula')
        employee = Employee.query.filter_by(cedula=cedula).first()
        if employee:
            return jsonify({"status": "success", "employee": {"nombre": employee.nombre, "apellido": employee.apellido}})
        else:
            return jsonify({"status": "fail", "message": "Cédula no encontrada"}), 404
    except Exception as e:
        print(f"Error en la función login: {e}")
        return jsonify({"status": "fail", "message": "Error en el servidor"}), 500

# Ruta para registrar las horas
@app.route('/api/log_time', methods=['POST'])
def log_time():
    try:
        cedula = request.json.get('cedula')
        tipo = request.json.get('tipo')
        employee = Employee.query.filter_by(cedula=cedula).first()
        if employee:
            nuevo_registro = RegistroHora(tipo=tipo, employee_id=employee.id)
            db.session.add(nuevo_registro)
            db.session.commit()
            return jsonify({"status": "success", "message": f"{tipo.capitalize()} marcada correctamente"})
        else:
            return jsonify({"status": "fail", "message": "Empleado no encontrado"}), 404
    except Exception as e:
        print(f"Error en la función log_time: {e}")
        return jsonify({"status": "fail", "message": "Error en el servidor"}), 500

from datetime import datetime, timedelta

# Ruta para verificar si ya hay un registro de entrada hoy
@app.route('/api/check_entry', methods=['POST'])
def check_entry():
    try:
        cedula = request.json.get('cedula')
        employee = Employee.query.filter_by(cedula=cedula).first()

        if employee:
            now = datetime.now()
            start_of_day = datetime(now.year, now.month, now.day)

            # Consulta todos los registros de entrada y salida del día de hoy
            registros = RegistroHora.query.filter(
                RegistroHora.employee_id == employee.id,
                RegistroHora.timestamp >= start_of_day
            ).order_by(RegistroHora.timestamp).all()

            if registros:
                # Determina el último registro del día
                ultimo_registro = registros[-1]
                tipo_ultimo_registro = ultimo_registro.tipo  # 'entrada' o 'salida'

                # Respuesta según el último registro del día
                return jsonify({
                    "status": "success",
                    "ultimo_registro": tipo_ultimo_registro,  # Indica si fue 'entrada' o 'salida'
                    "timestamp": ultimo_registro.timestamp.strftime('%H:%M:%S')
                }), 200
            else:
                # Si no hay registros hoy, indica que no ha marcado entrada
                return jsonify({
                    "status": "success",
                    "ultimo_registro": "none",
                    "message": "No hay registros hoy"
                }), 200
        else:
            return jsonify({"status": "fail", "message": "Empleado no encontrado"}), 404

    except Exception as e:
        print(f"Error en la función check_entry: {e}")
        return jsonify({"status": "fail", "message": "Error en el servidor"}), 500


# Ruta para obtener los registros de entrada y salida de un empleado
@app.route('/api/get_logs', methods=['POST'])
def get_logs():
    try:
        cedula = request.json.get('cedula')
        employee = Employee.query.filter_by(cedula=cedula).first()

        if employee:
            now = datetime.now()
            start_of_day = datetime(now.year, now.month, now.day)

            # Consulta todos los registros de entrada y salida del día de hoy
            registros = RegistroHora.query.filter(
                RegistroHora.employee_id == employee.id,
                RegistroHora.timestamp >= start_of_day
            ).order_by(RegistroHora.timestamp).all()

            # Inicializa la lista de registros y el tiempo total trabajado
            lista_registros = []
            total_trabajado = timedelta(0)
            ultima_entrada = None

            # Procesa cada registro para calcular el tiempo trabajado
            for registro in registros:
                lista_registros.append({
                    "tipo": registro.tipo,
                    "hora": registro.timestamp.strftime('%H:%M:%S'),
                    "fecha": registro.timestamp.strftime('%d/%m/%Y')
                })

                # Calcular el tiempo trabajado entre entrada y salida
                if registro.tipo == 'entrada':
                    ultima_entrada = registro.timestamp
                elif registro.tipo == 'salida' and ultima_entrada:
                    tiempo_trabajado = registro.timestamp - ultima_entrada
                    total_trabajado += tiempo_trabajado
                    ultima_entrada = None

            # Formatea el tiempo total trabajado en horas y minutos
            horas, resto = divmod(total_trabajado.total_seconds(), 3600)
            minutos, _ = divmod(resto, 60)
            total_horas_trabajadas = f"{int(horas)} horas, {int(minutos)} minutos"

            # Imprime la respuesta para verificar su estructura
            response_data = {
                "status": "success",
                "registros": lista_registros,
                "total_trabajado": total_horas_trabajadas if lista_registros else "0 horas, 0 minutos"
            }
            print("Estructura de la respuesta desde el backend:", response_data)

            return jsonify(response_data), 200

        else:
            print("Empleado no encontrado.")
            return jsonify({"status": "fail", "message": "Empleado no encontrado"}), 404

    except Exception as e:
        print(f"Error en la función get_logs: {e}")
        return jsonify({"status": "fail", "message": "Error en el servidor"}), 500

# Iniciar la aplicación
if __name__ == '__main__':
    create_tables()
    app.run(debug=True)

