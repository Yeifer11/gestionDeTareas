/**
 * GestorFPQRS — cases.js
 * Módulo de Bandeja de Casos: tabla, filtros, paginación, CRUD simulado
 * Requiere: jQuery, main.js
 */

FPQRS.casesModule = {

  /* Estado interno del módulo */
  state: {
    casosFiltrados: [],  // Array de casos después de aplicar filtros
    currentPage:    1,
    perPage:        10,
    sortCol:        'fechaRadicado',
    sortDir:        'desc'
  },

  /* ————————————————————————
     INICIALIZACIÓN
  ———————————————————————— */
  init: function() {
    // Verificar sesión
    if (!FPQRS.auth.requireAuth()) return;

    FPQRS.utils.showLoading();
    FPQRS.data.load().then(function() {
      FPQRS.utils.hideLoading();
      FPQRS.casesModule.state.casosFiltrados = FPQRS.data.casos.slice();
      FPQRS.casesModule.renderStats();
      FPQRS.casesModule.renderTable();
      FPQRS.casesModule.bindEvents();
      FPQRS.casesModule.fillFilterOptions();
    });
  },

  /* ————————————————————————
     ESTADÍSTICAS (tarjetas)
  ———————————————————————— */
  renderStats: function() {
    var stats = FPQRS.data.estadisticas;
    $('#statActivos').text(stats.casosActivos || 0);
    $('#statVencido').text(stats.slaVencido   || 0);
    $('#statProximo').text(stats.proximosAVencer || 0);
    $('#statCerrado').text(stats.cerradosHoy  || 0);
  },

  /* ————————————————————————
     RENDER DE LA TABLA
  ———————————————————————— */
  renderTable: function() {
    var self   = FPQRS.casesModule;
    var state  = self.state;
    var casos  = state.casosFiltrados;

    // Paginación
    var total  = casos.length;
    var start  = (state.currentPage - 1) * state.perPage;
    var end    = Math.min(start + state.perPage, total);
    var pagina = casos.slice(start, end);

    var $tbody = $('#casesTableBody').empty();

    if (pagina.length === 0) {
      $tbody.append(
        '<tr><td colspan="13" class="text-center py-4">' +
        '<div class="empty-state"><i class="bi bi-inbox"></i>' +
        '<p>No se encontraron casos con los filtros aplicados.</p></div></td></tr>'
      );
      $('#tablePaginationInfo').text('Sin resultados');
      $('#tablePagination').empty();
      return;
    }

    pagina.forEach(function(c) {
      var fila = FPQRS.casesModule.buildRow(c);
      $tbody.append(fila);
    });

    // Info de paginación
    $('#tablePaginationInfo').text(
      'Mostrando ' + (start + 1) + '–' + end + ' de ' + total + ' casos'
    );

    // Renderizar paginador
    FPQRS.casesModule.renderPagination(total, state.currentPage, state.perPage);
  },

  /**
   * Construye el HTML de una fila de la tabla
   */
  buildRow: function(c) {
    var utils = FPQRS.utils;
    var semaforoClass = utils.claseSemaforo(c.semaforo);
    var semaforoLabel = c.semaforo || 'En tiempo';
    var semaforoIcon  = '';
    if (semaforoLabel === 'Vencido')          semaforoIcon = '🔴';
    else if (semaforoLabel === 'Próximo a vencer') semaforoIcon = '🟡';
    else if (semaforoLabel === 'Cerrado')      semaforoIcon = '⚫';
    else                                       semaforoIcon = '🟢';

    return '<tr data-id="' + c.id + '">' +
      '<td><span class="radicado-code">' + c.id + '</span></td>' +
      '<td>' + utils.formatDateShort(c.fechaRadicado) + '</td>' +
      '<td><span class="badge-tipo ' + utils.badgeTipo(c.tipo) + '">' + c.tipo + '</span></td>' +
      '<td class="text-truncate-cell col-hide-mobile" title="' + c.servicio + '">' + c.servicio + '</td>' +
      '<td class="text-truncate-cell col-hide-mobile" title="' + c.categoria + '">' + c.categoria + '</td>' +
      '<td class="text-truncate-cell col-hide-tablet" title="' + c.subcategoria + '">' + c.subcategoria + '</td>' +
      '<td class="text-truncate-cell col-hide-mobile" title="' + c.asociado.nombre + '">' + c.asociado.nombre + '</td>' +
      '<td class="col-hide-tablet">' + c.responsable + '</td>' +
      '<td><span class="badge-prioridad ' + utils.clasePrioridad(c.prioridad) + '">' + c.prioridad + '</span></td>' +
      '<td><span class="badge-estado ' + utils.badgeEstado(c.estado) + '">' + c.estado + '</span></td>' +
      '<td class="col-hide-mobile">' + utils.formatDateShort(c.limiteSLA) + '</td>' +
      '<td><span class="semaforo ' + semaforoClass + '"><span class="semaforo-dot"></span>' + semaforoLabel + '</span></td>' +
      '<td>' +
        '<a href="case-detail.html?id=' + c.id + '" class="action-view-btn" title="Ver detalle del caso">' +
          '<i class="bi bi-eye"></i>' +
        '</a>' +
      '</td>' +
    '</tr>';
  },

  /* ————————————————————————
     PAGINACIÓN
  ———————————————————————— */
  renderPagination: function(total, current, perPage) {
    var totalPages = Math.ceil(total / perPage);
    var $pag = $('#tablePagination').empty();

    if (totalPages <= 1) return;

    var createItem = function(label, page, disabled, active) {
      var liClass = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
      var href    = disabled ? '#' : '#';
      return '<li class="' + liClass + '">' +
        '<a class="page-link" href="' + href + '" data-page="' + page + '">' + label + '</a>' +
        '</li>';
    };

    $pag.append(createItem('&laquo;', current - 1, current === 1));

    // Mostrar máximo 5 páginas alrededor de la actual
    var start = Math.max(1, current - 2);
    var end   = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);

    if (start > 1) {
      $pag.append(createItem('1', 1));
      if (start > 2) $pag.append('<li class="page-item disabled"><a class="page-link">…</a></li>');
    }

    for (var p = start; p <= end; p++) {
      $pag.append(createItem(p, p, false, p === current));
    }

    if (end < totalPages) {
      if (end < totalPages - 1) $pag.append('<li class="page-item disabled"><a class="page-link">…</a></li>');
      $pag.append(createItem(totalPages, totalPages));
    }

    $pag.append(createItem('&raquo;', current + 1, current === totalPages));
  },

  /* ————————————————————————
     FILTROS
  ———————————————————————— */
  fillFilterOptions: function() {
    // Tipos únicos
    var tipos = [...new Set(FPQRS.data.casos.map(function(c) { return c.tipo; }))].sort();
    tipos.forEach(function(t) {
      $('#filterTipo').append('<option value="' + t + '">' + t + '</option>');
    });

    // Estados únicos
    var estados = [...new Set(FPQRS.data.casos.map(function(c) { return c.estado; }))].sort();
    estados.forEach(function(e) {
      $('#filterEstado').append('<option value="' + e + '">' + e + '</option>');
    });

    // Servicios únicos
    var servicios = [...new Set(FPQRS.data.casos.map(function(c) { return c.servicio; }))].sort();
    servicios.forEach(function(s) {
      $('#filterServicio').append('<option value="' + s + '">' + s + '</option>');
    });
  },

  applyFilters: function() {
    var filtros = {
      texto:    $('#filterSearch').val().trim(),
      tipo:     $('#filterTipo').val(),
      estado:   $('#filterEstado').val(),
      servicio: $('#filterServicio').val(),
      semaforo: $('#filterSemaforo').val()
    };

    FPQRS.casesModule.state.casosFiltrados = FPQRS.data.buscarCasos(filtros);
    FPQRS.casesModule.state.currentPage = 1;
    FPQRS.casesModule.renderTable();
  },

  resetFilters: function() {
    $('#filterSearch, #filterTipo, #filterEstado, #filterServicio, #filterSemaforo').val('');
    FPQRS.casesModule.state.casosFiltrados = FPQRS.data.casos.slice();
    FPQRS.casesModule.state.currentPage = 1;
    FPQRS.casesModule.renderTable();
    FPQRS.utils.toast('Filtros limpiados.', 'info', 2000);
  },

  /* ————————————————————————
     EVENTOS
  ———————————————————————— */
  bindEvents: function() {
    var self = FPQRS.casesModule;

    // Búsqueda con debounce (espera 350ms tras dejar de escribir)
    var searchTimer;
    $('#filterSearch').on('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() { self.applyFilters(); }, 350);
    });

    // Filtros por select
    $('#filterTipo, #filterEstado, #filterServicio, #filterSemaforo').on('change', function() {
      self.applyFilters();
    });

    // Limpiar filtros
    $('#btnResetFilters').on('click', function() { self.resetFilters(); });

    // Panel de filtros colapsable
    $('#filterToggle').on('click', function() {
      var $btn = $(this);
      var expanded = $btn.attr('aria-expanded') === 'true';
      $('#filterBody').slideToggle(200);
      $btn.attr('aria-expanded', !expanded).toggleClass('active', !expanded);
    });

    // Paginación (delegación de eventos)
    $(document).on('click', '#tablePagination .page-link', function(e) {
      e.preventDefault();
      var page = parseInt($(this).data('page'));
      if (!isNaN(page) && page >= 1) {
        self.state.currentPage = page;
        self.renderTable();
        $('html,body').animate({ scrollTop: $('#casesTableWrapper').offset().top - 80 }, 200);
      }
    });

    // Registros por página
    $('#perPageSelect').on('change', function() {
      self.state.perPage = parseInt($(this).val()) || 10;
      self.state.currentPage = 1;
      self.renderTable();
    });

    // Clic en fila → navegar al detalle
    $(document).on('click', '#casesTableBody tr', function(e) {
      // No redirigir si se hizo clic en un botón o enlace
      if ($(e.target).closest('a, button').length) return;
      var id = $(this).data('id');
      if (id) window.location.href = 'case-detail.html?id=' + id;
    });

    // Botón exportar (simulado)
    $('#btnExportar').on('click', function() {
      FPQRS.utils.toast('Exportación iniciada. El archivo se descargará en breve.', 'info');
    });

    // Botón actualizar
    $('#btnActualizar').on('click', function() {
      FPQRS.utils.showLoading();
      setTimeout(function() {
        FPQRS.utils.hideLoading();
        self.applyFilters();
        FPQRS.utils.toast('Bandeja actualizada.', 'success', 2000);
      }, 600);
    });

    // Ordenamiento por columna
    $(document).on('click', '.sortable', function() {
      var col = $(this).data('col');
      if (self.state.sortCol === col) {
        self.state.sortDir = self.state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        self.state.sortCol = col;
        self.state.sortDir = 'asc';
      }
      self.sortCasos();
      self.renderTable();
      // Actualizar íconos de sort
      $('.sortable i').removeClass('bi-sort-up bi-sort-down').addClass('bi-arrow-down-up');
      $(this).find('i')
        .removeClass('bi-arrow-down-up')
        .addClass(self.state.sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down');
    });
  },

  /* ————————————————————————
     ORDENAMIENTO
  ———————————————————————— */
  sortCasos: function() {
    var col = FPQRS.casesModule.state.sortCol;
    var dir = FPQRS.casesModule.state.sortDir;

    FPQRS.casesModule.state.casosFiltrados.sort(function(a, b) {
      var va = a[col] || '';
      var vb = b[col] || '';
      // Fechas: comparar como strings ISO (se ordenan correctamente)
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });
  }

};

/* ——————————————————————————
   INICIALIZAR al cargar el DOM
—————————————————————————— */
$(function() {
  if ($('#casesTableBody').length) {
    FPQRS.casesModule.init();
  }
});
