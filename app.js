// ============================================================================
// App: Venta de Mercadería (PWA - Práctico 11: De la web al celular)
// Desarrollada con asistencia de IA siguiendo los 8 pasos de la guía PWA.
// Almacenamiento 100% local en localStorage + respaldo Exportar/Importar JSON.
// ============================================================================

const STORAGE_PRODUCTOS = "vm_productos_v1";
const STORAGE_VENTAS = "vm_ventas_v1";

// Datos iniciales de ejemplo para probar al instante
const PRODUCTOS_INICIALES = [
  { id: "p1", nombre: "Yerba Mate Tradicional 1kg", precio: 4200, stock: 25, categoria: "Almacén" },
  { id: "p2", nombre: "Azúcar Común 1kg", precio: 1350, stock: 40, categoria: "Almacén" },
  { id: "p3", nombre: "Aceite Girasol 900ml", precio: 2400, stock: 18, categoria: "Almacén" },
  { id: "p4", nombre: "Gaseosa Cola 2.25L", precio: 3100, stock: 15, categoria: "Bebidas" },
  { id: "p5", nombre: "Fideos Tallarines 500g", precio: 1150, stock: 30, categoria: "Pastas" },
  { id: "p6", nombre: "Lavandina Clásica 1L", precio: 1400, stock: 20, categoria: "Limpieza" }
];

let productos = [];
let ventas = [];
let carrito = [];

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  configurarNavegacion();
  configurarEventos();
  configurarEstadoConexion();
  renderizarTodo();
});

function cargarDatos() {
  const prodGuardados = localStorage.getItem(STORAGE_PRODUCTOS);
  const ventasGuardadas = localStorage.getItem(STORAGE_VENTAS);

  if (prodGuardados) {
    productos = JSON.parse(prodGuardados);
  } else {
    productos = [...PRODUCTOS_INICIALES];
    guardarProductos();
  }

  ventas = ventasGuardadas ? JSON.parse(ventasGuardadas) : [];
}

function guardarProductos() {
  localStorage.setItem(STORAGE_PRODUCTOS, JSON.stringify(productos));
}

function guardarVentas() {
  localStorage.setItem(STORAGE_VENTAS, JSON.stringify(ventas));
}

function formatearMoneda(valor) {
  return "$" + Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// --- Navegación entre vistas ---
function configurarNavegacion() {
  const botonesNav = document.querySelectorAll(".nav-btn");
  const vistas = document.querySelectorAll(".vista");

  botonesNav.forEach(btn => {
    btn.addEventListener("click", () => {
      const destino = btn.dataset.vista;
      botonesNav.forEach(b => b.classList.remove("activo"));
      vistas.forEach(v => v.classList.remove("activa"));

      btn.classList.add("activo");
      document.getElementById(destino).classList.add("activa");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// --- Eventos de la interfaz ---
function configurarEventos() {
  // Buscador de productos
  document.getElementById("buscar-producto").addEventListener("input", (e) => {
    renderizarCatalogo(e.target.value);
  });

  // Carrito: vaciar, registrar venta, enviar por WhatsApp
  document.getElementById("btn-vaciar-carrito").addEventListener("click", () => {
    carrito = [];
    renderizarCarrito();
  });

  document.getElementById("btn-registrar-venta").addEventListener("click", registrarVenta);
  document.getElementById("btn-whatsapp-carrito").addEventListener("click", enviarPresupuestoWhatsApp);

  // Formulario de alta/edición de mercadería
  document.getElementById("form-producto").addEventListener("submit", guardarProductoFormulario);
  document.getElementById("btn-cancelar-edicion").addEventListener("click", resetearFormularioProducto);

  // Exportar e Importar JSON (Paso 7)
  document.getElementById("btn-exportar-json").addEventListener("click", exportarJSON);
  document.getElementById("input-importar-json").addEventListener("change", importarJSON);
}

// --- Renderizado General ---
function renderizarTodo() {
  renderizarCatalogo(document.getElementById("buscar-producto").value);
  renderizarCarrito();
  renderizarProductosAdmin();
  renderizarHistorial();
  actualizarCajaHoy();
}

function renderizarCatalogo(filtro = "") {
  const contenedor = document.getElementById("catalogo-grid");
  const texto = filtro.trim().toLowerCase();

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(texto) ||
    (p.categoria && p.categoria.toLowerCase().includes(texto))
  );

  if (filtrados.length === 0) {
    contenedor.innerHTML = `<p class="texto-vacio" style="grid-column: 1 / -1;">No se encontró mercadería con ese nombre.</p>`;
    return;
  }

  contenedor.innerHTML = filtrados.map(p => {
    const sinStock = p.stock <= 0;
    return `
      <article class="producto-card ${sinStock ? "sin-stock" : ""}">
        <div>
          <span class="prod-cat">${escapeHtml(p.categoria || "General")}</span>
          <h3 class="prod-titulo">${escapeHtml(p.nombre)}</h3>
        </div>
        <div>
          <div class="prod-meta">
            <span class="prod-precio">${formatearMoneda(p.precio)}</span>
            <span class="prod-stock">Stock: ${p.stock}</span>
          </div>
          <button type="button" class="btn-primario btn-sm" style="margin-top:8px;"
            ${sinStock ? "disabled" : ""}
            onclick="agregarAlCarrito('${p.id}')">
            ${sinStock ? "Sin stock" : "+ Agregar"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

// --- Lógica del Carrito y Ventas ---
window.agregarAlCarrito = function(idProducto) {
  const prod = productos.find(p => p.id === idProducto);
  if (!prod || prod.stock <= 0) return;

  const existente = carrito.find(item => item.id === idProducto);
  if (existente) {
    if (existente.cantidad < prod.stock) {
      existente.cantidad++;
    } else {
      alert("No hay más stock disponible de este producto.");
      return;
    }
  } else {
    carrito.push({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      cantidad: 1
    });
  }

  // Vibración corta táctil si el celular lo permite
  if ("vibrate" in navigator) {
    navigator.vibrate(40);
  }

  renderizarCarrito();
};

window.cambiarCantidadCarrito = function(idProducto, delta) {
  const index = carrito.findIndex(item => item.id === idProducto);
  if (index === -1) return;

  const prod = productos.find(p => p.id === idProducto);
  const nuevaCant = carrito[index].cantidad + delta;

  if (nuevaCant <= 0) {
    carrito.splice(index, 1);
  } else if (prod && nuevaCant <= prod.stock) {
    carrito[index].cantidad = nuevaCant;
  } else {
    alert("Stock máximo alcanzado para este producto.");
  }

  renderizarCarrito();
};

function renderizarCarrito() {
  const lista = document.getElementById("carrito-lista");
  const totalEl = document.getElementById("carrito-total");

  if (carrito.length === 0) {
    lista.innerHTML = `<p class="texto-vacio">Tocá un producto arriba para agregarlo a la venta.</p>`;
    totalEl.textContent = "$0";
    return;
  }

  let total = 0;
  lista.innerHTML = carrito.map(item => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    return `
      <div class="item-carrito">
        <div class="item-carrito-info">
          <div class="item-carrito-nombre">${escapeHtml(item.nombre)}</div>
          <div class="item-carrito-sub">${formatearMoneda(item.precio)} c/u • Sub: ${formatearMoneda(subtotal)}</div>
        </div>
        <div class="controles-cantidad">
          <button type="button" class="btn-cant" onclick="cambiarCantidadCarrito('${item.id}', -1)" aria-label="Restar">−</button>
          <span class="cant-num">${item.cantidad}</span>
          <button type="button" class="btn-cant" onclick="cambiarCantidadCarrito('${item.id}', 1)" aria-label="Sumar">+</button>
        </div>
      </div>
    `;
  }).join("");

  totalEl.textContent = formatearMoneda(total);
}

function registrarVenta() {
  if (carrito.length === 0) {
    alert("Agregá al menos un producto antes de registrar la venta.");
    return;
  }

  const cliente = document.getElementById("cliente-nombre").value.trim() || "Consumidor Final";
  const telefono = document.getElementById("cliente-telefono").value.replace(/\D/g, "");
  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // Descontar stock
  carrito.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.cantidad);
    }
  });

  const nuevaVenta = {
    id: "V-" + Date.now().toString().slice(-6),
    fecha: new Date().toISOString(),
    cliente,
    telefono,
    items: carrito.map(i => ({ ...i })),
    total
  };

  ventas.unshift(nuevaVenta);
  guardarProductos();
  guardarVentas();

  carrito = [];
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-telefono").value = "";

  renderizarTodo();
  alert(`✅ Venta ${nuevaVenta.id} registrada por ${formatearMoneda(total)}`);
}

function enviarPresupuestoWhatsApp() {
  if (carrito.length === 0) {
    alert("Agregá productos al carrito para armar el mensaje de WhatsApp.");
    return;
  }

  const cliente = document.getElementById("cliente-nombre").value.trim() || "Cliente";
  const telefono = document.getElementById("cliente-telefono").value.replace(/\D/g, "");
  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  let texto = `🛒 *Detalle de Pedido - Venta de Mercadería*\n`;
  texto += `👤 Cliente: ${cliente}\n\n`;
  carrito.forEach(item => {
    texto += `• ${item.cantidad}x ${item.nombre}: ${formatearMoneda(item.precio * item.cantidad)}\n`;
  });
  texto += `\n💰 *TOTAL: ${formatearMoneda(total)}*`;

  const url = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  window.open(url, "_blank");
}

// --- Gestión de Mercadería (CRUD) ---
function guardarProductoFormulario(e) {
  e.preventDefault();
  const idEdicion = document.getElementById("prod-id").value;
  const nombre = document.getElementById("prod-nombre").value.trim();
  const precio = parseFloat(document.getElementById("prod-precio").value);
  const stock = parseInt(document.getElementById("prod-stock").value, 10);
  const categoria = document.getElementById("prod-categoria").value.trim() || "General";

  if (!nombre || isNaN(precio) || isNaN(stock)) return;

  if (idEdicion) {
    const idx = productos.findIndex(p => p.id === idEdicion);
    if (idx !== -1) {
      productos[idx] = { ...productos[idx], nombre, precio, stock, categoria };
    }
  } else {
    productos.unshift({
      id: "p-" + Date.now(),
      nombre,
      precio,
      stock,
      categoria
    });
  }

  guardarProductos();
  resetearFormularioProducto();
  renderizarTodo();
}

window.editarProducto = function(id) {
  const prod = productos.find(p => p.id === id);
  if (!prod) return;

  document.getElementById("prod-id").value = prod.id;
  document.getElementById("prod-nombre").value = prod.nombre;
  document.getElementById("prod-precio").value = prod.precio;
  document.getElementById("prod-stock").value = prod.stock;
  document.getElementById("prod-categoria").value = prod.categoria || "";

  document.getElementById("btn-guardar-prod").textContent = "💾 Actualizar Producto";
  document.getElementById("btn-cancelar-edicion").classList.remove("oculto");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.eliminarProducto = function(id) {
  if (!confirm("¿Seguro que querés eliminar este producto?")) return;
  productos = productos.filter(p => p.id !== id);
  carrito = carrito.filter(c => c.id !== id);
  guardarProductos();
  renderizarTodo();
};

function resetearFormularioProducto() {
  document.getElementById("form-producto").reset();
  document.getElementById("prod-id").value = "";
  document.getElementById("btn-guardar-prod").textContent = "💾 Guardar Producto";
  document.getElementById("btn-cancelar-edicion").classList.add("oculto");
}

function renderizarProductosAdmin() {
  const contenedor = document.getElementById("lista-productos-admin");
  if (productos.length === 0) {
    contenedor.innerHTML = `<p class="texto-vacio">Todavía no hay productos cargados.</p>`;
    return;
  }

  contenedor.innerHTML = productos.map(p => `
    <div class="tarjeta-item">
      <div class="tarjeta-top">
        <div>
          <span class="prod-cat">${escapeHtml(p.categoria || "General")}</span>
          <h4>${escapeHtml(p.nombre)}</h4>
        </div>
        <div style="text-align:right;">
          <strong class="prod-precio">${formatearMoneda(p.precio)}</strong>
          <div class="prod-stock">Stock: ${p.stock} u.</div>
        </div>
      </div>
      <div class="tarjeta-acciones">
        <button type="button" class="btn-secundario btn-sm" onclick="editarProducto('${p.id}')">✏️ Editar</button>
        <button type="button" class="btn-peligro btn-sm" onclick="eliminarProducto('${p.id}')">🗑️ Borrar</button>
      </div>
    </div>
  `).join("");
}

// --- Historial y Caja ---
function actualizarCajaHoy() {
  const hoyStr = new Date().toISOString().slice(0, 10);
  const totalHoy = ventas
    .filter(v => v.fecha.slice(0, 10) === hoyStr)
    .reduce((acc, v) => acc + v.total, 0);

  document.getElementById("caja-hoy").textContent = `Hoy: ${formatearMoneda(totalHoy)}`;
}

function renderizarHistorial() {
  const lista = document.getElementById("lista-ventas");
  document.getElementById("stat-cant-ventas").textContent = ventas.length;
  const recaudado = ventas.reduce((acc, v) => acc + v.total, 0);
  document.getElementById("stat-total-recaudado").textContent = formatearMoneda(recaudado);

  if (ventas.length === 0) {
    lista.innerHTML = `<p class="texto-vacio">Aún no se registraron ventas.</p>`;
    return;
  }

  lista.innerHTML = ventas.map(v => {
    const fechaLocal = new Date(v.fecha).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    });
    const detalle = v.items.map(i => `${i.cantidad}x ${escapeHtml(i.nombre)}`).join(", ");
    return `
      <div class="tarjeta-item">
        <div class="tarjeta-top">
          <div>
            <strong>${v.id} • ${escapeHtml(v.cliente)}</strong>
            <div class="prod-stock">${fechaLocal}</div>
          </div>
          <strong class="prod-precio">${formatearMoneda(v.total)}</strong>
        </div>
        <p style="font-size:0.88rem; color:#475569;">${detalle}</p>
      </div>
    `;
  }).join("");
}

// --- Exportar e Importar JSON con navigator.share (Paso 7 del PDF) ---
async function exportarJSON() {
  const respaldo = {
    app: "Venta de Mercadería",
    exportadoEn: new Date().toISOString(),
    productos,
    ventas
  };

  const jsonStr = JSON.stringify(respaldo, null, 2);
  const nombreArchivo = `venta-mercaderia-${new Date().toISOString().slice(0, 10)}.json`;
  const archivo = new File([jsonStr], nombreArchivo, { type: "application/json" });

  // Si el celular permite compartir archivos con navigator.share
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        title: "Respaldo Venta de Mercadería",
        text: "Copia de seguridad de productos y ventas (JSON)",
        files: [archivo]
      });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // Usuario canceló el menú compartir
    }
  }

  // Alternativa de descarga directa en computadora o navegadores sin share de archivos
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importarJSON(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = (evento) => {
    try {
      const datos = JSON.parse(evento.target.result);
      if (Array.isArray(datos.productos) && Array.isArray(datos.ventas)) {
        productos = datos.productos;
        ventas = datos.ventas;
        guardarProductos();
        guardarVentas();
        carrito = [];
        renderizarTodo();
        alert("✅ Datos importados correctamente.");
      } else {
        alert("El archivo JSON no tiene el formato válido de Venta de Mercadería.");
      }
    } catch (error) {
      alert("Error al leer el archivo JSON.");
    }
    e.target.value = "";
  };
  lector.readAsText(archivo);
}

// --- Detección de conexión / modo avión (Paso 7 del PDF) ---
function configurarEstadoConexion() {
  const banner = document.getElementById("offline-banner");

  function actualizarBanner() {
    if (navigator.onLine) {
      banner.classList.add("oculto");
    } else {
      banner.classList.remove("oculto");
    }
  }

  window.addEventListener("online", actualizarBanner);
  window.addEventListener("offline", actualizarBanner);
  actualizarBanner();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// Registro del Service Worker y aviso de actualización (Pasos 4 y 8 del PDF)
// ============================================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        // Detectar si se instala una versión nueva del Service Worker (Paso 8)
        reg.addEventListener("updatefound", () => {
          const nuevoWorker = reg.installing;
          if (!nuevoWorker) return;

          nuevoWorker.addEventListener("statechange", () => {
            if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
              const updateBanner = document.getElementById("update-banner");
              if (updateBanner) {
                updateBanner.classList.remove("oculto");
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn("No se pudo registrar el Service Worker:", err);
      });
  });
}