import { pool } from './db.js';
import bcrypt from 'bcryptjs';

/**
 * SQL Schema para inicialización
 */
const schema = `
CREATE TABLE IF NOT EXISTS \`alertas\` (
  \`alerta_id\` int NOT NULL AUTO_INCREMENT,
  \`ingrediente_id\` int DEFAULT NULL,
  \`fecha\` date DEFAULT NULL,
  \`mensaje\` text COLLATE utf8mb3_spanish2_ci,
  PRIMARY KEY (\`alerta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`clientes\` (
  \`cliente_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`categoria\` enum('Snack','Externo','Especial') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`telefono\` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`direccion\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`zona\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`tarjeta_snack\` int DEFAULT '0',
  PRIMARY KEY (\`cliente_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`contenedores\` (
  \`contenedor_id\` int NOT NULL AUTO_INCREMENT,
  \`cliente_id\` int DEFAULT NULL,
  \`estado\` enum('EnUso','Devuelto','Baja') COLLATE utf8mb3_spanish2_ci DEFAULT 'EnUso',
  \`uso_actual\` int DEFAULT '0',
  PRIMARY KEY (\`contenedor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`ingredientes\` (
  \`ingrediente_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`unidad_medida\` enum('gr','Kg','Doc','Uni','Mt','cm') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`stock_actual\` decimal(10,3) DEFAULT '0.000',
  \`stock_minimo\` decimal(10,3) DEFAULT '0.000',
  \`costo_unitario\` decimal(10,3) DEFAULT '0.000',
  PRIMARY KEY (\`ingrediente_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`precio_insumos\` (
  \`precio_id\` int NOT NULL AUTO_INCREMENT,
  \`ingrediente_id\` int DEFAULT NULL,
  \`fecha\` date DEFAULT NULL,
  \`costo_unitario\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`precio_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`productos\` (
  \`producto_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`sabor\` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`precio_snack\` decimal(10,2) DEFAULT NULL,
  \`precio_externo\` decimal(10,2) DEFAULT NULL,
  \`precio_especial\` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (\`producto_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`recetas\` (
  \`receta_id\` int NOT NULL AUTO_INCREMENT,
  \`producto_id\` int DEFAULT NULL,
  \`ingrediente_id\` int DEFAULT NULL,
  \`cantidad_necesaria\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`receta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`usuarios\` (
  \`usuario_id\` int NOT NULL AUTO_INCREMENT,
  \`username\` varchar(50) COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`password\` varchar(255) COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`rol\` enum('Administrador','Vendedor','Cliente') COLLATE utf8mb3_spanish2_ci NOT NULL,
  \`activo\` tinyint(1) DEFAULT '1',
  \`cliente_id\` int DEFAULT NULL,
  PRIMARY KEY (\`usuario_id\`),
  UNIQUE KEY \`username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`ventas\` (
  \`venta_id\` int NOT NULL AUTO_INCREMENT,
  \`fecha\` date DEFAULT NULL,
  \`hora\` time DEFAULT NULL,
  \`cliente_id\` int DEFAULT NULL,
  \`subtotal\` decimal(10,2) DEFAULT '0.00',
  \`descuento\` decimal(10,2) DEFAULT '0.00',
  \`envio\` decimal(10,2) DEFAULT '0.00',
  \`impuesto\` decimal(10,2) DEFAULT '0.00',
  \`total\` decimal(10,2) DEFAULT NULL,
  \`usuario_id\` int DEFAULT NULL,
  \`forma_pago\` enum('QR','Contado','CreditoDia') COLLATE utf8mb3_spanish2_ci DEFAULT 'QR',
  \`estado_pago\` enum('Pagado','Pendiente') COLLATE utf8mb3_spanish2_ci DEFAULT 'Pagado',
  PRIMARY KEY (\`venta_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`detalle_venta\` (
  \`detalle_id\` int NOT NULL AUTO_INCREMENT,
  \`venta_id\` int DEFAULT NULL,
  \`producto_id\` int DEFAULT NULL,
  \`cantidad\` int DEFAULT NULL,
  \`precio_unitario\` decimal(10,2) DEFAULT NULL,
  \`subtotal\` decimal(10,2) DEFAULT NULL,
  \`es_regalo\` tinyint DEFAULT '0',
  PRIMARY KEY (\`detalle_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`egresos\` (
  \`egreso_id\` int NOT NULL AUTO_INCREMENT,
  \`fecha\` date DEFAULT NULL,
  \`ambito\` enum('Proceso','Personal','Casa') COLLATE utf8mb3_spanish2_ci DEFAULT 'Proceso',
  \`categoria\` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`cantidad\` decimal(10,2) DEFAULT '1.00',
  \`precio_unitario\` decimal(10,2) DEFAULT NULL,
  \`tipo\` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT 'Otros',
  \`concepto\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`monto\` decimal(10,3) DEFAULT NULL,
  \`proveedor_id\` int DEFAULT NULL,
  \`ingrediente_id\` int DEFAULT NULL,
  PRIMARY KEY (\`egreso_id\`),
  KEY \`ingrediente_id\` (\`ingrediente_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`proveedores\` (
  \`proveedor_id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`telefono\` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  \`direccion\` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  PRIMARY KEY (\`proveedor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`rentabilidad_historica\` (
  \`registro_id\` int NOT NULL AUTO_INCREMENT,
  \`producto_id\` int NOT NULL,
  \`fecha\` date NOT NULL,
  \`costo_total\` decimal(10,3) NOT NULL,
  \`margen_snack\` decimal(10,3) DEFAULT NULL,
  \`margen_externo\` decimal(10,3) DEFAULT NULL,
  \`margen_especial\` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (\`registro_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

CREATE TABLE IF NOT EXISTS \`historial_contenedores\` (
  \`historial_id\` int NOT NULL AUTO_INCREMENT,
  \`contenedor_id\` int DEFAULT NULL,
  \`cliente_id\` int DEFAULT NULL,
  \`fecha\` datetime DEFAULT CURRENT_TIMESTAMP,
  \`tipo\` enum('Entrega','Devolucion') COLLATE utf8mb3_spanish2_ci DEFAULT 'Devolucion',
  PRIMARY KEY (\`historial_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;
`;

/**
 * Carga datos iniciales (Seed) para insumos y productos base
 */
const seedDatabase = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("🌱 Sembrando datos iniciales...");

    // 1. Insumos Base
    const insumos = [
      ['Harina Especial', 'Kg', 50, 5, 4.50],
      ['Huevo Rosado', 'Doc', 100, 10, 6.00],
      ['Azúcar Blanca', 'Kg', 40, 4, 3.80],
      ['Aceite Vegetal', 'Uni', 20, 2, 7.50],
      ['Sal Yodada', 'gr', 1000, 100, 0.01],
      ['Maizena', 'gr', 500, 50, 0.05],
      ['Cremor Tartaro', 'gr', 200, 20, 0.15],
      ['Polvo de Hornear', 'gr', 300, 30, 0.08]
    ];

    const [insumoResult] = await connection.query(
      "INSERT INTO ingredientes (nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario) VALUES ?",
      [insumos]
    );

    // 2. Producto de Ejemplo
    const [prodResult] = await connection.query(
      "INSERT INTO productos (nombre, sabor, precio_snack, precio_externo, precio_especial) VALUES (?, ?, ?, ?, ?)",
      ['Chifón Clásico Zuzú', 'Vainilla', 25.00, 28.00, 22.00]
    );
    const productoId = prodResult.insertId;

    // 3. Receta para el producto de ejemplo (Vinculando con los IDs insertados)
    // Obtenemos los IDs reales de los insumos recién creados
    const [rows] = await connection.query("SELECT ingrediente_id, nombre FROM ingredientes");
    
    const getIngId = (name) => rows.find(r => r.nombre.includes(name))?.ingrediente_id;

    const receta = [
      [productoId, getIngId('Harina'), 0.285],
      [productoId, getIngId('Huevo'), 8],
      [productoId, getIngId('Azúcar'), 0.250],
      [productoId, getIngId('Aceite'), 0.140]
    ].filter(item => item[1] !== undefined);

    if (receta.length > 0) {
      await connection.query(
        "INSERT INTO recetas (producto_id, ingrediente_id, cantidad_necesaria) VALUES ?",
        [receta]
      );
    }

    await connection.commit();
    console.log("✨ Datos iniciales cargados con éxito.");
  } catch (error) {
    await connection.rollback();
    console.error("⚠️ No se pudo completar el seeding:", error.message);
  } finally {
    connection.release();
  }
};

/**
 * Aplica migraciones automáticas sobre tablas existentes si faltan columnas nuevas.
 */
export const runMigrations = async () => {
  try {
    // 1. Columnas para ventas (estado_pago y hora)
    const [colsVentas] = await pool.query("SHOW COLUMNS FROM ventas LIKE 'estado_pago'");
    if (colsVentas.length === 0) {
      console.log("🔄 Aplicando migración a tabla 'ventas'...");
      await pool.query("ALTER TABLE ventas ADD COLUMN estado_pago ENUM('Pagado', 'Pendiente') NOT NULL DEFAULT 'Pagado'");
      await pool.query("ALTER TABLE ventas ADD COLUMN hora TIME DEFAULT NULL");
      await pool.query("UPDATE ventas SET estado_pago = 'Pendiente' WHERE forma_pago = 'CreditoDia'");
      console.log("✅ Columnas estado_pago y hora agregadas a tabla ventas.");
    }

    // 1b. Columnas de montos adicionales para ventas (subtotal, descuento, envio, impuesto)
    const [colsVentasDescuento] = await pool.query("SHOW COLUMNS FROM ventas LIKE 'descuento'");
    if (colsVentasDescuento.length === 0) {
      console.log("🔄 Aplicando migración de cargos finales (subtotal, descuento, envio, impuesto) a tabla 'ventas'...");
      const addColSafe = async (table, col, def) => {
        const [c] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${col}'`);
        if (c.length === 0) {
          await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
        }
      };
      await addColSafe('ventas', 'subtotal', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
      await addColSafe('ventas', 'descuento', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
      await addColSafe('ventas', 'envio', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
      await addColSafe('ventas', 'impuesto', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
      await pool.query("UPDATE ventas SET subtotal = COALESCE(total, 0.00) WHERE subtotal = 0.00");
      console.log("✅ Columnas subtotal, descuento, envio e impuesto agregadas a tabla ventas.");
    }

    // 2. Columnas para egresos (ambito, categoria, cantidad, precio_unitario)
    const [colsEgresos] = await pool.query("SHOW COLUMNS FROM egresos LIKE 'ambito'");
    if (colsEgresos.length === 0) {
      console.log("🔄 Aplicando migración a tabla 'egresos'...");
      await pool.query("ALTER TABLE egresos ADD COLUMN ambito ENUM('Proceso', 'Personal', 'Casa') NOT NULL DEFAULT 'Proceso'");
      await pool.query("ALTER TABLE egresos ADD COLUMN categoria VARCHAR(50) DEFAULT NULL");
      await pool.query("ALTER TABLE egresos ADD COLUMN cantidad DECIMAL(10,2) DEFAULT 1.00");
      await pool.query("ALTER TABLE egresos ADD COLUMN precio_unitario DECIMAL(10,2) DEFAULT NULL");

      // Clasificación inicial inteligente para los registros existentes
      await pool.query("UPDATE egresos SET ambito = 'Proceso', categoria = 'Ingredientes' WHERE tipo = 'Insumos'");
      await pool.query("UPDATE egresos SET ambito = 'Personal', categoria = 'Sueldo' WHERE tipo = 'Sueldo'");
      await pool.query("UPDATE egresos SET ambito = 'Casa', categoria = 'Almuerzo' WHERE tipo = 'Almuerzo'");
      await pool.query("UPDATE egresos SET ambito = 'Proceso', categoria = 'Pasajes' WHERE tipo = 'Pasajes'");
      await pool.query("UPDATE egresos SET ambito = 'Proceso', categoria = 'Otros' WHERE tipo = 'Otros'");
      console.log("✅ Columnas ambito, categoria, cantidad, precio_unitario agregadas a tabla egresos.");
    }

    const [colsTipo] = await pool.query("SHOW COLUMNS FROM egresos LIKE 'tipo'");
    if (colsTipo.length > 0 && colsTipo[0].Type.toLowerCase().startsWith('enum')) {
      console.log("🔄 Modificando columna 'tipo' en egresos a VARCHAR(50)...");
      await pool.query("ALTER TABLE egresos MODIFY COLUMN tipo VARCHAR(50) NULL DEFAULT 'Otros'");
      console.log("✅ Columna 'tipo' en egresos modificada a VARCHAR(50).");
    }

    const [colsIngId] = await pool.query("SHOW COLUMNS FROM egresos LIKE 'ingrediente_id'");
    if (colsIngId.length === 0) {
      console.log("🔄 Agregando columna 'ingrediente_id' a tabla 'egresos'...");
      await pool.query("ALTER TABLE egresos ADD COLUMN ingrediente_id INT NULL DEFAULT NULL AFTER proveedor_id, ADD KEY (ingrediente_id)");
      console.log("✅ Columna 'ingrediente_id' agregada a tabla egresos.");
    }

    // 3. Columna zona en clientes
    const [colsZona] = await pool.query("SHOW COLUMNS FROM clientes LIKE 'zona'");
    if (colsZona.length === 0) {
      console.log("🔄 Aplicando migración de 'zona' a tabla 'clientes'...");
      await pool.query("ALTER TABLE clientes ADD COLUMN zona VARCHAR(100) DEFAULT NULL AFTER direccion");
      await pool.query("UPDATE clientes SET zona = 'RAMADA' WHERE nombre LIKE '%Dayana%' OR nombre LIKE '%Yudith%' OR direccion LIKE '%Ramada%'");
      await pool.query("UPDATE clientes SET zona = 'U.A.G.R.M' WHERE direccion LIKE '%UAGRM%' OR nombre LIKE '%Derecho%' OR nombre LIKE '%Combito%' OR nombre LIKE '%Amalia%' OR nombre LIKE '%Cristina%'");
      await pool.query("UPDATE clientes SET zona = 'OTROS' WHERE zona IS NULL");
      console.log("✅ Columna 'zona' agregada a tabla clientes.");
    }

    // 4. Tablas de contenedores y cartillas snack
    await pool.query(`
      CREATE TABLE IF NOT EXISTS control_envases (
        registro_id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        fecha DATE NOT NULL,
        tipo ENUM('Entrega', 'Devolucion', 'Baja') NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        venta_id INT NULL,
        condicion ENUM('Sano', 'Danado', 'Desechado') DEFAULT 'Sano',
        ciclo_uso INT DEFAULT 1,
        observaciones VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (cliente_id),
        KEY (fecha)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cartillas_cliente (
        cartilla_id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        numero_cartilla VARCHAR(20) NOT NULL,
        tipo ENUM('Activo', 'Preferente') NOT NULL DEFAULT 'Activo',
        fecha_inicio DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        estado ENUM('EnCurso', 'Completada', 'Canjeada', 'Vencida') NOT NULL DEFAULT 'EnCurso',
        chifones_acumulados INT DEFAULT 0,
        envases_devueltos INT DEFAULT 0,
        fecha_canje DATE NULL,
        notas VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (cliente_id),
        KEY (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cartilla_slots (
        slot_id INT AUTO_INCREMENT PRIMARY KEY,
        cartilla_id INT NOT NULL,
        slot_numero INT NOT NULL,
        venta_id INT NULL,
        fecha_venta DATE NULL,
        producto_nombre VARCHAR(100) NULL,
        sabor_abrev VARCHAR(10) NULL,
        fecha_devolucion DATE NULL,
        envase_devuelto TINYINT(1) DEFAULT 0,
        observaciones VARCHAR(100) NULL,
        KEY (cartilla_id),
        UNIQUE KEY (cartilla_id, slot_numero)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [colsTipoCartilla] = await pool.query("SHOW COLUMNS FROM clientes LIKE 'tipo_cartilla'");
    if (colsTipoCartilla.length === 0) {
      await pool.query("ALTER TABLE clientes ADD COLUMN tipo_cartilla ENUM('Activo', 'Preferente') DEFAULT 'Activo'");
    }

    // 5. Columna usuario_id en control_envases para control por vendedor
    const [colsEnvasesUser] = await pool.query("SHOW COLUMNS FROM control_envases LIKE 'usuario_id'");
    if (colsEnvasesUser.length === 0) {
      console.log("🔄 Aplicando migración de 'usuario_id' a tabla 'control_envases'...");
      await pool.query("ALTER TABLE control_envases ADD COLUMN usuario_id INT NULL AFTER cliente_id");
      await pool.query(`
        UPDATE control_envases ce 
        JOIN ventas v ON ce.venta_id = v.venta_id 
        SET ce.usuario_id = v.usuario_id 
        WHERE ce.usuario_id IS NULL AND ce.venta_id IS NOT NULL
      `);
      console.log("✅ Columna 'usuario_id' agregada a tabla control_envases.");
    }
  } catch (error) {
    console.error("⚠️ Error durante las migraciones de base de datos:", error.message);
  }
};

/**
 * Inicializa la base de datos solo si no existen tablas.
 */
export const initializeDatabase = async () => {
  try {
    const dbName = process.env.DB_NAME || 'bdchifon';
    console.log(`📡 Probando conexión al host: ${process.env.DB_HOST || 'localhost'}...`);

    // 1. Verificar si la base de datos ya tiene tablas
    console.log(`🔍 Verificando tablas en la base de datos: ${dbName}...`);
    
    const [rows] = await pool.query("SHOW TABLES");
    
    if (rows.length > 0) {
      console.log("ℹ️ La base de datos ya contiene tablas. Verificando migraciones pendientes...");
      await runMigrations();
      return true;
    }

    console.log("🚀 Base de datos vacía detectada. Iniciando creación de esquema...");

    // 2. Ejecutar el esquema completo
    const statements = schema.split(';').filter(st => st.trim() !== '');
    for (const statement of statements) {
      await pool.query(statement);
    }
    
    // 3. Cargar datos de prueba
    await seedDatabase();
    
    console.log("✅ Esquema de base de datos creado exitosamente.");

    // 3. Crear usuario administrador por defecto si no existe (Opcional pero recomendado)
    const [adminExists] = await pool.query("SELECT * FROM usuarios WHERE username = 'Administrador'");
    if (adminExists.length === 0) {
      // Generamos el hash dinámicamente para asegurar compatibilidad
      const defaultAdminPass = await bcrypt.hash('Cristo*777', 10); 
      await pool.query(
        "INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)",
        ['Administrador', defaultAdminPass, 'Administrador']
      );
      console.log("👤 Usuario administrador por defecto creado (Administrador/Administrador).");
    }

  } catch (error) {
    console.error("❌ Error durante la inicialización de la base de datos:", error);
    throw error;
  }
};
