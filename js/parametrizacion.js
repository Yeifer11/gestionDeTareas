/**
 * GestorFPQRS — parametrizacion.js
 * Módulo de Parametrización: catálogo de Servicios y navegación entre catálogos
 * Requiere: jQuery, main.js
 */

FPQRS.paramModule = {

  state: {
    section: 'servicios',
    search: '',
    filtro: 'todos'
  },

  /* Metadatos de cada catálogo del menú lateral */
  sections: {
    servicios:             { titulo: 'Servicios',                 desc: 'Productos y servicios ofrecidos por la cooperativa' },
    categorias:             { titulo: 'Categorías',                desc: 'Categorías asociadas a cada servicio' },
    subcategorias:          { titulo: 'Subcategorías',             desc: 'Subcategorías asociadas a cada categoría' },
    'tipos-caso':           { titulo: 'Tipos de Caso',             desc: 'Felicitación, Petición, Queja, Reclamo y Sugerencia' },
    'tipos-id':             { titulo: 'Tipos de Identificación',  desc: 'Documentos de identificación aceptados' },
    estados:                { titulo: 'Estados del Caso',          desc: 'Estados posibles durante el ciclo de vida del caso' },
    prioridades:            { titulo: 'Prioridades',               desc: 'Niveles de prioridad y su orden de atención' },
    'prioridades-categoria': { titulo: 'Prioridades por Categoría', desc: 'Prioridad asignada automáticamente según la categoría' },
    causas:                 { titulo: 'Tipos de Causa',            desc: 'Causas raíz utilizadas en el cierre de casos' },
    soluciones:             { titulo: 'Tipos de Solución',         desc: 'Soluciones aplicadas utilizadas en el cierre de casos' },
    responsables:           { titulo: 'Responsables',              desc: 'Empleados que pueden ser asignados a un caso' },
    usuarios:               { titulo: 'Usuarios del Sistema',      desc: 'Cuentas con acceso al sistema y su rol' }
  },

  init: function() {
    if (!FPQRS.auth.requireAuth()) return;
    FPQRS.data.load().then(function() {
      FPQRS.paramModule.bindEvents();
      FPQRS.paramModule.renderSection();
    });
  },

  bindEvents: function() {
    var self = this;

    $(document).on('click', '.param-nav-link', function() {
      $('.param-nav-link').removeClass('active');
      $(this).addClass('active');
      self.state.section = $(this).data('section');
      self.state.search = '';
      self.state.filtro = 'todos';
      self.renderSection();
    });

    $(document).on('input', '#paramSearch', function() {
      self.state.search = $(this).val().toLowerCase().trim();
      self.renderServiciosTable();
    });

    $(document).on('click', '.param-pill', function() {
      $('.param-pill').removeClass('active');
      $(this).addClass('active');
      self.state.filtro = $(this).data('filter');
      self.renderServiciosTable();
    });

    $(document).on('click', '#btnCrearRegistro', function() {
      FPQRS.utils.toast('Funcionalidad de creación disponible próximamente.', 'info', 2500);
    });

    $(document).on('click', '.param-action-btn.edit', function() {
      var nombre = $(this).closest('tr').data('nombre');
      FPQRS.utils.toast('Editar "' + nombre + '" — disponible próximamente.', 'info', 2500);
    });

    $(document).on('click', '.param-action-btn.toggle', function() {
      var $row    = $(this).closest('tr');
      var nombre  = $row.data('nombre');
      var item    = FPQRS.data.serviciosCatalogo.find(function(s) { return s.nombre === nombre; });
      if (!item) return;
      item.estado = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
      FPQRS.utils.toast('"' + nombre + '" ahora está ' + item.estado.toLowerCase() + '.', 'success', 2000);
      FPQRS.paramModule.renderServiciosTable();
    });
  },

  /**
   * Renderiza la sección activa: breadcrumb, título y el bloque de contenido
   * (tabla de Servicios si aplica, o un estado vacío para los demás catálogos).
   */
  renderSection: function() {
    var meta = this.sections[this.state.section];
    $('#paramBreadcrumbCurrent').text(meta.titulo);
    $('#paramSectionTitle').text(meta.titulo);

    if (this.state.section === 'servicios') {
      $('#paramSectionContent').html(this.tplServiciosCard(meta));
      this.renderServiciosTable();
    } else {
      $('#paramSectionContent').html(this.tplEmptySection(meta));
    }
  },

  tplServiciosCard: function(meta) {
    return (
      '<div class="param-card">' +
        '<div class="param-card-header">' +
          '<div>' +
            '<h3>' + meta.titulo + '</h3>' +
            '<p>' + meta.desc + '</p>' +
          '</div>' +
          '<button class="btn btn-primary btn-sm" id="btnCrearRegistro">' +
            '<i class="bi bi-plus-lg me-1"></i>Crear servicio' +
          '</button>' +
        '</div>' +
        '<div class="param-toolbar">' +
          '<div class="param-search">' +
            '<i class="bi bi-search"></i>' +
            '<input type="text" id="paramSearch" placeholder="Buscar servicio...">' +
          '</div>' +
          '<div class="param-filter-pills">' +
            '<button class="param-pill active" data-filter="todos">Todos</button>' +
            '<button class="param-pill" data-filter="activos">Activos</button>' +
            '<button class="param-pill" data-filter="inactivos">Inactivos</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-responsive-fpqrs">' +
          '<table class="param-table">' +
            '<thead><tr>' +
              '<th>Nombre</th><th>Descripción</th><th>Estado</th><th class="text-end">Acciones</th>' +
            '</tr></thead>' +
            '<tbody id="paramTableBody"></tbody>' +
          '</table>' +
        '</div>' +
        '<div class="param-card-footer">' +
          '<p>Mostrando <strong id="paramShowCount">0</strong> de <strong id="paramTotalCount">0</strong> registros</p>' +
          '<span id="paramStatusSummary"></span>' +
        '</div>' +
      '</div>'
    );
  },

  tplEmptySection: function(meta) {
    return (
      '<div class="param-empty-section">' +
        '<i class="bi bi-cone-striped"></i>' +
        '<p class="fw-semibold mb-1">' + meta.titulo + '</p>' +
        '<p class="small mb-0">Este catálogo aún no está disponible en la demostración.</p>' +
      '</div>'
    );
  },

  renderServiciosTable: function() {
    var self  = this;
    var datos = FPQRS.data.serviciosCatalogo.filter(function(s) {
      var coincideTexto  = !self.state.search || s.nombre.toLowerCase().indexOf(self.state.search) !== -1;
      var coincideFiltro = self.state.filtro === 'todos' ||
        (self.state.filtro === 'activos'   && s.estado === 'Activo') ||
        (self.state.filtro === 'inactivos' && s.estado === 'Inactivo');
      return coincideTexto && coincideFiltro;
    });

    var $tbody = $('#paramTableBody').empty();
    if (!datos.length) {
      $tbody.html('<tr><td colspan="4" class="text-center text-muted py-4">No se encontraron servicios.</td></tr>');
    } else {
      datos.forEach(function(s) {
        var pillClass = s.estado === 'Activo' ? 'activo' : 'inactivo';
        var toggleIcon = s.estado === 'Activo' ? 'bi-power' : 'bi-arrow-counterclockwise';
        var toggleTitle = s.estado === 'Activo' ? 'Inactivar registro' : 'Activar registro';
        $tbody.append(
          '<tr data-nombre="' + FPQRS.paramModule.escapeHtml(s.nombre) + '">' +
            '<td>' + FPQRS.paramModule.escapeHtml(s.nombre) + '</td>' +
            '<td>' + FPQRS.paramModule.escapeHtml(s.descripcion) + '</td>' +
            '<td><span class="param-status-pill ' + pillClass + '">' + s.estado + '</span></td>' +
            '<td>' +
              '<div class="param-row-actions">' +
                '<button class="param-action-btn edit" title="Editar registro"><i class="bi bi-pencil"></i></button>' +
                '<button class="param-action-btn toggle" title="' + toggleTitle + '"><i class="bi ' + toggleIcon + '"></i></button>' +
              '</div>' +
            '</td>' +
          '</tr>'
        );
      });
    }

    var total    = FPQRS.data.serviciosCatalogo.length;
    var activos  = FPQRS.data.serviciosCatalogo.filter(function(s) { return s.estado === 'Activo'; }).length;
    $('#paramShowCount').text(datos.length);
    $('#paramTotalCount').text(total);
    $('#paramStatusSummary').text(activos + ' activos · ' + (total - activos) + ' inactivos');
  },

  escapeHtml: function(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

$(function() {
  if ($('#paramSectionContent').length) {
    FPQRS.paramModule.init();
  }
});
