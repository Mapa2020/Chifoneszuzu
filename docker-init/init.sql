-- Base de Datos para Chifones Zuzú (Docker)
-- Generado automáticamente con datos maestros preservados (productos, clientes, usuarios, insumos, proveedores, recetas)
-- Tablas transaccionales limpias (ventas, egresos, contenedores, cartillas, etc.)

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `alertas`;
CREATE TABLE `alertas` (
  `alerta_id` int NOT NULL AUTO_INCREMENT,
  `ingrediente_id` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `mensaje` text COLLATE utf8mb3_spanish2_ci,
  PRIMARY KEY (`alerta_id`),
  KEY `ingrediente_id` (`ingrediente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

DROP TABLE IF EXISTS `cartilla_slots`;
CREATE TABLE `cartilla_slots` (
  `slot_id` int NOT NULL AUTO_INCREMENT,
  `cartilla_id` int NOT NULL,
  `slot_numero` int NOT NULL,
  `venta_id` int DEFAULT NULL,
  `fecha_venta` date DEFAULT NULL,
  `producto_nombre` varchar(100) DEFAULT NULL,
  `sabor_abrev` varchar(10) DEFAULT NULL,
  `fecha_devolucion` date DEFAULT NULL,
  `envase_devuelto` tinyint(1) DEFAULT '0',
  `observaciones` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`slot_id`),
  UNIQUE KEY `cartilla_id_2` (`cartilla_id`,`slot_numero`),
  KEY `cartilla_id` (`cartilla_id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cartillas_cliente`;
CREATE TABLE `cartillas_cliente` (
  `cartilla_id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int NOT NULL,
  `numero_cartilla` varchar(20) NOT NULL,
  `tipo` enum('Activo','Preferente') NOT NULL DEFAULT 'Activo',
  `fecha_inicio` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('EnCurso','Completada','Canjeada','Vencida') NOT NULL DEFAULT 'EnCurso',
  `chifones_acumulados` int DEFAULT '0',
  `envases_devueltos` int DEFAULT '0',
  `fecha_canje` date DEFAULT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cartilla_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `estado` (`estado`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `clientes`;
CREATE TABLE `clientes` (
  `cliente_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `categoria` enum('Snack','Externo','Especial') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `zona` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `tarjeta_snack` tinyint(1) DEFAULT '0',
  `tipo_cartilla` enum('Activo','Preferente') COLLATE utf8mb3_spanish2_ci DEFAULT 'Activo',
  PRIMARY KEY (`cliente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para clientes (16 registros)
INSERT INTO `clientes` (`cliente_id`, `nombre`, `categoria`, `telefono`, `direccion`, `zona`, `tarjeta_snack`, `tipo_cartilla`) VALUES
(1, 'Amalia Gruñona', 'Snack', '73243560', 'UAGRM Fac. Humanidades', 'U.A.G.R.M', 2, 'Activo'),
(2, 'Saul Veterinaria', 'Snack', '73134134', 'UAGRM Fac. Veterinaria', 'U.A.G.R.M', 2, 'Activo'),
(3, 'Ana Combito', 'Snack', '712341234', 'UAGRM Fac. Financiera', 'U.A.G.R.M', 4, 'Activo'),
(4, 'Julio Minero', 'Externo', '72141214', 'La Ramada', 'RAMADA', 0, 'Activo'),
(5, 'Gabriela', 'Snack', '712123', 'Colegio Guido', 'OTROS', 0, 'Activo'),
(6, 'Yudith', 'Snack', '76544331', ' 6to anillo La Villa', 'RAMADA', 2, 'Activo'),
(7, 'Manuel', 'Externo', '72662853', 'El Quior c/8 sur No 25', 'OTROS', 0, 'Activo'),
(8, 'Mariela Industrial', 'Snack', '76334563', 'UAGRM', 'U.A.G.R.M', 1, 'Activo'),
(9, 'Mama de Will', 'Snack', '3456523452', 'Colegio Huancho', 'OTROS', 2, 'Activo'),
(10, 'Ma. Eugenia Derecho', 'Snack', '43523452', 'UAGRM', 'U.A.G.R.M', 2, 'Activo'),
(11, 'Cristina Humanidades', 'Snack', '7234344524', 'UAGRM', 'U.A.G.R.M', 2, 'Activo'),
(12, 'Caty Taller IMAV', 'Snack', '2452454526', '4to anillo y radial 10', 'OTROS', 1, 'Activo'),
(13, 'Colegio Guido', 'Snack', '674567456', 'La Ramada', 'RAMADA', 0, 'Activo'),
(14, 'Particular', 'Externo', '56345634', 'sin dir', 'OTROS', 0, 'Activo'),
(15, 'Comercio', 'Snack', '775467567', 'UAGRM', 'U.A.G.R.M', 2, 'Activo'),
(16, 'Dayana Santos', 'Snack', '7657567856', 'La Ramada', 'RAMADA', 2, 'Activo');

DROP TABLE IF EXISTS `contenedores`;
CREATE TABLE `contenedores` (
  `contenedor_id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int DEFAULT NULL,
  `estado` enum('EnUso','Devuelto','Baja') CHARACTER SET utf8mb3 COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `uso_actual` int DEFAULT '0',
  PRIMARY KEY (`contenedor_id`),
  KEY `cliente_id` (`cliente_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

DROP TABLE IF EXISTS `control_envases`;
CREATE TABLE `control_envases` (
  `registro_id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int NOT NULL,
  `fecha` date NOT NULL,
  `tipo` enum('Entrega','Devolucion','Baja') NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `venta_id` int DEFAULT NULL,
  `condicion` enum('Sano','Danado','Desechado') DEFAULT 'Sano',
  `ciclo_uso` int DEFAULT '1',
  `observaciones` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`registro_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `fecha` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `detalle_venta`;
CREATE TABLE `detalle_venta` (
  `detalle_id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `cantidad` int DEFAULT NULL,
  `precio_unitario` decimal(10,3) DEFAULT NULL,
  `subtotal` decimal(10,3) DEFAULT NULL,
  `es_regalo` tinyint DEFAULT '0',
  PRIMARY KEY (`detalle_id`),
  KEY `venta_id` (`venta_id`),
  KEY `producto_id` (`producto_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

DROP TABLE IF EXISTS `egresos`;
CREATE TABLE `egresos` (
  `egreso_id` int NOT NULL AUTO_INCREMENT,
  `fecha` date DEFAULT NULL,
  `tipo` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT 'Otros',
  `concepto` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `monto` decimal(10,3) DEFAULT NULL,
  `proveedor_id` int DEFAULT NULL,
  `ingrediente_id` int DEFAULT NULL,
  `ambito` enum('Proceso','Personal','Casa') COLLATE utf8mb3_spanish2_ci NOT NULL DEFAULT 'Proceso',
  `categoria` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `cantidad` decimal(10,2) DEFAULT '1.00',
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`egreso_id`),
  KEY `proveedor_id` (`proveedor_id`),
  KEY `ingrediente_id` (`ingrediente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

DROP TABLE IF EXISTS `ingredientes`;
CREATE TABLE `ingredientes` (
  `ingrediente_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `unidad_medida` enum('gr','Kg','Doc','Uni','Mt','cm','lt') COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `stock_actual` decimal(10,3) DEFAULT '0.000',
  `stock_minimo` decimal(10,3) DEFAULT '0.000',
  `costo_unitario` decimal(10,3) DEFAULT '0.000',
  PRIMARY KEY (`ingrediente_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para ingredientes (26 registros)
INSERT INTO `ingredientes` (`ingrediente_id`, `nombre`, `unidad_medida`, `stock_actual`, `stock_minimo`, `costo_unitario`) VALUES
(1, 'Harina princesa', 'Kg', '114.350', '10.000', '6.600'),
(2, 'Chocolate Top ', 'Kg', '4.800', '1.000', '65.000'),
(3, 'Polvo de Hornear Fleshman', 'Kg', '1.280', '0.500', '35.000'),
(4, 'Chocolate Granulado Lluvias', 'Kg', '1.280', '0.500', '56.000'),
(5, 'Cremor Tartaro', 'Kg', '0.860', '0.500', '98.000'),
(6, 'Chocolate Top pepitas', 'Kg', '4.280', '1.000', '66.000'),
(7, 'Galletas Oreo', 'Uni', '30.000', '3.000', '10.455'),
(8, 'Azucar Aguai', 'Kg', '97.000', '5.000', '5.800'),
(9, 'Maizena', 'Kg', '7.010', '1.000', '18.750'),
(10, 'Aceite', 'lt', '6.080', '5.000', '16.000'),
(11, 'Huevos', 'Uni', '312.000', '30.000', '0.867'),
(12, 'Mani tostado', 'Kg', '1.160', '0.500', '30.000'),
(13, 'Escencia Vainilla', 'lt', '0.320', '0.250', '150.000'),
(14, 'Escencia de Limon', 'lt', '0.550', '0.250', '150.000'),
(15, 'Azucar Glass', 'Kg', '1.900', '0.500', '14.000'),
(16, 'Limon de Licuar', 'Uni', '75.000', '6.000', '0.800'),
(17, 'Escencia de Toffe', 'lt', '1.160', '0.250', '150.000'),
(18, 'Escencia de Naranja', 'lt', '0.950', '0.250', '150.000'),
(19, 'Escencia de Chocolate', 'lt', '0.730', '0.250', '150.000'),
(20, 'Cacao en Polvo', 'Kg', '0.410', '0.250', '150.000'),
(21, 'Sal de Mesa', 'Kg', '0.350', '0.250', '4.000'),
(22, 'Escencia de Maracuya', 'lt', '0.450', '0.250', '150.000'),
(23, 'Maracuya', 'Uni', '40.000', '12.000', '3.750'),
(24, 'Piña', 'Uni', '3.000', '1.000', '10.000'),
(25, 'Naranja', 'Uni', '50.000', '5.000', '0.600'),
(26, 'Chocolate TOP Blanco', 'Uni', '1.000', '1.000', '65.000');

DROP TABLE IF EXISTS `permisos`;
CREATE TABLE `permisos` (
  `permiso_id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `recurso` varchar(100) COLLATE utf8mb3_spanish2_ci NOT NULL,
  `accion` enum('LECTURA','ESCRITURA','ACTUALIZAR','ELIMINAR') COLLATE utf8mb3_spanish2_ci NOT NULL,
  PRIMARY KEY (`permiso_id`),
  KEY `rol_id` (`rol_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para permisos (2 registros)
INSERT INTO `permisos` (`permiso_id`, `rol_id`, `recurso`, `accion`) VALUES
(1, 7, 'Dashboard, Ventas, Contenedores', 'LECTURA'),
(2, 1, 'Dashboard, Ventas, Reportes, Contenedores, Productos', 'ESCRITURA');

DROP TABLE IF EXISTS `precio_insumos`;
CREATE TABLE `precio_insumos` (
  `precio_id` int NOT NULL AUTO_INCREMENT,
  `ingrediente_id` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `costo_unitario` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (`precio_id`),
  KEY `ingrediente_id` (`ingrediente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para precio_insumos (60 registros)
INSERT INTO `precio_insumos` (`precio_id`, `ingrediente_id`, `fecha`, `costo_unitario`) VALUES
(1, 7, '2026-03-31 04:00:00', '14.000'),
(2, 7, '2026-03-31 04:00:00', '14.000'),
(3, 7, '2026-03-31 04:00:00', '14.000'),
(4, 11, '2026-03-31 04:00:00', '0.830'),
(5, 12, '2026-03-31 04:00:00', '30.000'),
(6, 10, '2026-03-31 04:00:00', '80.000'),
(7, 8, '2026-03-31 04:00:00', '30.000'),
(8, 5, '2026-03-31 04:00:00', '95.000'),
(9, 4, '2026-03-31 04:00:00', '56.000'),
(10, 3, '2026-03-31 04:00:00', '35.000'),
(11, 2, '2026-03-31 04:00:00', '68.000'),
(12, 1, '2026-03-31 04:00:00', '6.090'),
(13, 9, '2026-03-31 04:00:00', '9.000'),
(14, 6, '2026-03-31 04:00:00', '46.000'),
(15, 13, '2026-03-31 04:00:00', '150.000'),
(16, 1, '2026-03-31 04:00:00', '6.090'),
(17, 14, '2026-03-31 04:00:00', '150.000'),
(18, 11, '2026-03-31 04:00:00', '0.830'),
(19, 11, '2026-03-31 04:00:00', '0.830'),
(20, 11, '2026-03-31 04:00:00', '0.830'),
(21, 15, '2026-04-01 04:00:00', '14.000'),
(22, 15, '2026-04-01 04:00:00', '14.000'),
(23, 4, '2026-04-01 04:00:00', '56.000'),
(24, 4, '2026-04-01 04:00:00', '56.000'),
(25, 13, '2026-04-01 04:00:00', '150.000'),
(26, 16, '2026-04-01 04:00:00', '0.320'),
(27, 16, '2026-04-01 04:00:00', '0.320'),
(28, 17, '2026-04-01 04:00:00', '150.000'),
(29, 18, '2026-04-01 04:00:00', '150.000'),
(30, 19, '2026-04-01 04:00:00', '150.000'),
(31, 20, '2026-04-01 04:00:00', '120.000'),
(32, 21, '2026-04-01 04:00:00', '4.000'),
(33, 7, '2026-04-01 04:00:00', '2.300'),
(34, 20, '2026-04-01 04:00:00', '150.000'),
(35, 22, '2026-04-01 04:00:00', '150.000'),
(36, 23, '2026-04-01 04:00:00', '1.600'),
(37, 1, '2026-04-01 04:00:00', '6.090'),
(38, 3, '2026-04-01 04:00:00', '35.000'),
(39, 4, '2026-04-01 04:00:00', '56.000'),
(40, 7, '2026-04-01 04:00:00', '2.330'),
(41, 11, '2026-04-01 04:00:00', '0.830'),
(42, 16, '2026-04-01 04:00:00', '0.320'),
(43, 17, '2026-04-01 04:00:00', '150.000'),
(44, 23, '2026-04-01 04:00:00', '1.670'),
(45, 24, '2026-04-02 04:00:00', '14.000'),
(46, 1, '2026-06-02 04:00:00', '6.090'),
(47, 25, '2026-06-02 04:00:00', '0.250'),
(48, 25, '2026-06-02 04:00:00', '0.250'),
(49, 25, '2026-06-02 04:00:00', '0.600'),
(50, 16, '2026-06-03 04:00:00', '0.320');
INSERT INTO `precio_insumos` (`precio_id`, `ingrediente_id`, `fecha`, `costo_unitario`) VALUES
(51, 11, '2026-06-03 04:00:00', '0.830'),
(52, 8, '2026-06-03 04:00:00', '6.600'),
(53, 3, '2026-06-03 04:00:00', '35.000'),
(54, 5, '2026-06-03 04:00:00', '65.000'),
(55, 26, '2026-06-03 04:00:00', '65.000'),
(56, 23, '2026-09-29 04:00:00', '3.750'),
(57, 23, '2026-09-29 04:00:00', '3.750'),
(58, 1, '2026-09-30 04:00:00', '6.600'),
(59, 23, '2026-09-30 04:00:00', '3.750'),
(60, 22, '2026-09-30 04:00:00', '150.000');

DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
  `producto_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `sabor` varchar(50) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `precio_snack` decimal(10,3) DEFAULT NULL,
  `precio_externo` decimal(10,3) DEFAULT NULL,
  `precio_especial` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (`producto_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para productos (8 registros)
INSERT INTO `productos` (`producto_id`, `nombre`, `sabor`, `precio_snack`, `precio_externo`, `precio_especial`) VALUES
(1, 'Chifon Marmoleado', 'Marmolado', '78.000', '85.000', '110.000'),
(2, 'Chifon Limón', 'Limón', '78.000', '88.000', '95.000'),
(3, 'Chifon Oreo', 'Oreo', '80.000', '88.000', '95.000'),
(4, 'Chifon Chip', 'Choco Chip', '85.000', '95.000', '100.000'),
(5, 'Chifon Mani', 'Choco Maní', '85.000', '95.000', '105.000'),
(6, 'Chifon Naranja', 'Naranja', '65.000', '70.000', '80.000'),
(7, 'Chifon Maracuya', 'Maracuya', '80.000', '90.000', '100.000'),
(8, 'Chifon Piña', 'Piña', '105.000', '110.000', '120.000');

DROP TABLE IF EXISTS `proveedores`;
CREATE TABLE `proveedores` (
  `proveedor_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  PRIMARY KEY (`proveedor_id`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para proveedores (12 registros)
INSERT INTO `proveedores` (`proveedor_id`, `nombre`, `telefono`, `direccion`) VALUES
(1, 'Importaciones ZUNA', '73124510', 'La Ramada'),
(2, 'Molinera Princesa', '34578121', '3 pasos al frente, feria nueva'),
(3, 'Tiendas Katerina', '721548025', 'La Ramada'),
(4, 'Farmacia Telchi', '7215451', '2do anillo frente Iglesia'),
(5, 'Mercado Plan 3 mil', '751212121', 'Plan 3 Mil'),
(6, 'Mercado Guapuro', '74466131', 'Urb. Guapuro calle 1'),
(7, 'Mercado Quior', '7646131', 'El quior calle 15'),
(8, 'Tiendas UAGRM', '4567467465', 'Universidad Rene Moreno'),
(9, 'Whistupicuy', '71413512', 'Av. Irala 2do y 3er anillo'),
(10, 'Mercado Abasto 3er Anillo', '7676786786', '3er anillo y Pirai'),
(11, 'Mercado La Ramada', '3456345636', '2do anillo Calle Isabel la Catolica'),
(12, 'Mercado Mayor Abasto', '345634', '7mo anillo carr. doble via La Guardia');

DROP TABLE IF EXISTS `recetas`;
CREATE TABLE `recetas` (
  `receta_id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int DEFAULT NULL,
  `ingrediente_id` int DEFAULT NULL,
  `cantidad_necesaria` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (`receta_id`),
  KEY `producto_id` (`producto_id`),
  KEY `ingrediente_id` (`ingrediente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=293 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para recetas (76 registros)
INSERT INTO `recetas` (`receta_id`, `producto_id`, `ingrediente_id`, `cantidad_necesaria`) VALUES
(247, 1, 5, '0.050'),
(246, 1, 19, '0.050'),
(245, 1, 13, '0.010'),
(244, 1, 11, '8.000'),
(243, 1, 8, '0.250'),
(242, 1, 20, '0.030'),
(241, 1, 1, '0.360'),
(240, 1, 3, '0.020'),
(239, 1, 10, '0.100'),
(238, 2, 5, '0.030'),
(237, 2, 14, '0.050'),
(236, 2, 13, '0.050'),
(235, 2, 3, '0.020'),
(234, 2, 1, '0.290'),
(233, 2, 10, '0.140'),
(232, 2, 15, '0.120'),
(231, 2, 9, '0.030'),
(230, 2, 11, '8.000'),
(229, 2, 21, '0.050'),
(228, 2, 8, '0.250'),
(257, 3, 19, '0.030'),
(256, 3, 13, '0.050'),
(255, 3, 3, '0.020'),
(254, 3, 5, '0.030'),
(253, 3, 9, '0.030'),
(252, 3, 21, '0.050'),
(251, 3, 10, '0.140'),
(250, 3, 11, '8.000'),
(249, 3, 1, '0.290'),
(248, 3, 7, '4.000'),
(227, 4, 1, '0.290'),
(226, 4, 11, '8.000'),
(225, 4, 10, '0.140'),
(224, 4, 21, '0.050'),
(223, 4, 9, '0.030'),
(222, 4, 5, '0.030'),
(221, 4, 3, '0.020'),
(220, 4, 2, '0.050'),
(219, 4, 4, '0.060'),
(218, 4, 6, '0.060'),
(267, 5, 1, '0.290'),
(266, 5, 11, '8.000'),
(265, 5, 10, '0.140'),
(264, 5, 21, '0.050'),
(263, 5, 9, '0.030'),
(262, 5, 5, '0.030'),
(261, 5, 3, '0.020'),
(260, 5, 12, '0.040'),
(259, 5, 17, '0.040'),
(258, 5, 2, '0.100');
INSERT INTO `recetas` (`receta_id`, `producto_id`, `ingrediente_id`, `cantidad_necesaria`) VALUES
(198, 6, 1, '0.290'),
(197, 6, 11, '8.000'),
(196, 6, 10, '0.140'),
(195, 6, 21, '0.050'),
(194, 6, 9, '0.030'),
(193, 6, 5, '0.030'),
(192, 6, 3, '0.020'),
(191, 6, 18, '0.050'),
(190, 6, 15, '0.020'),
(276, 7, 23, '4.000'),
(275, 7, 1, '0.290'),
(274, 7, 11, '8.000'),
(273, 7, 10, '0.140'),
(272, 7, 21, '0.050'),
(271, 7, 9, '0.030'),
(270, 7, 5, '0.030'),
(269, 7, 3, '0.020'),
(268, 7, 22, '0.050'),
(292, 8, 1, '0.290'),
(291, 8, 11, '8.000'),
(290, 8, 10, '0.140'),
(289, 8, 21, '0.050'),
(288, 8, 9, '0.030'),
(287, 8, 5, '0.030'),
(286, 8, 3, '0.020'),
(285, 8, 13, '0.020');

DROP TABLE IF EXISTS `rentabilidad_historica`;
CREATE TABLE `rentabilidad_historica` (
  `registro_id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `fecha` date NOT NULL,
  `costo_total` decimal(10,3) NOT NULL,
  `margen_snack` decimal(10,3) DEFAULT NULL,
  `margen_externo` decimal(10,3) DEFAULT NULL,
  `margen_especial` decimal(10,3) DEFAULT NULL,
  PRIMARY KEY (`registro_id`),
  KEY `producto_id` (`producto_id`)
) ENGINE=MyISAM AUTO_INCREMENT=206 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `rol_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb3_spanish2_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb3_spanish2_ci DEFAULT NULL,
  PRIMARY KEY (`rol_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para roles (3 registros)
INSERT INTO `roles` (`rol_id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Administrador'),
(2, 'Vendedor', 'Crea pedido y verifica tarjeta'),
(3, 'Cliente', 'Hace pedido');

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `usuario_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb3_spanish2_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_spanish2_ci NOT NULL,
  `rol` enum('Administrador','Cliente','Vendedor') COLLATE utf8mb3_spanish2_ci NOT NULL DEFAULT 'Administrador',
  `cliente_id` int DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`usuario_id`),
  UNIQUE KEY `nombre_usuario` (`username`),
  KEY `cliente_id` (`cliente_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- Datos para usuarios (3 registros)
INSERT INTO `usuarios` (`usuario_id`, `username`, `password`, `rol`, `cliente_id`, `activo`) VALUES
(1, 'Manuel', '$2b$10$vfeq23ZI.I9RSapwBtNuzu.dIuFBx/z9JhU.Li50vjQSkoyTV/gwa', 'Vendedor', 7, 1),
(2, 'Manuel Pariona', '$2b$10$jtVFdzwOtI7YCJCCrLh2xe2S13oc1VpPNF6GBMeHa1lDxERNO26ky', 'Administrador', NULL, 1),
(3, 'Zully', '$2b$10$WP43gp/8kynXrAudyh72WOYmH9Vmp4LfFc3P5g66zEnshGOhUU9xm', 'Administrador', NULL, 1);

DROP TABLE IF EXISTS `ventas`;
CREATE TABLE `ventas` (
  `venta_id` int NOT NULL AUTO_INCREMENT,
  `fecha` date DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `total` decimal(10,3) DEFAULT NULL,
  `forma_pago` enum('QR','Contado','CreditoDia') COLLATE utf8mb3_spanish2_ci DEFAULT 'QR',
  `usuario_id` int DEFAULT NULL,
  `estado_pago` enum('Pagado','Pendiente') COLLATE utf8mb3_spanish2_ci NOT NULL DEFAULT 'Pagado',
  `hora` time DEFAULT NULL,
  PRIMARY KEY (`venta_id`),
  KEY `cliente_id` (`cliente_id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;


CREATE TABLE IF NOT EXISTS `historial_contenedores` (
  `historial_id` int NOT NULL AUTO_INCREMENT,
  `contenedor_id` int DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo` enum('Entrega','Devolucion') COLLATE utf8mb3_spanish2_ci DEFAULT 'Devolucion',
  PRIMARY KEY (`historial_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

SET FOREIGN_KEY_CHECKS = 1;
