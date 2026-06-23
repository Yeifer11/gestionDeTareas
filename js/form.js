/**
 * GestorFPQRS — form.js
 * Módulo del Formulario de Radicación FPQRS
 * Requiere: jQuery, main.js
 */

FPQRS.formModule = {

  /* Estado del formulario */
  state: {
    archivos:     [],    // Archivos adjuntos seleccionados
    maxArchivos:  5,
    maxSizeMB:    5
  },

  /* ————————————————————————
     INICIALIZACIÓN
  ———————————————————————— */
  init: function() {
    FPQRS.data.load().then(function() {
      FPQRS.formModule.bindEvents();
      FPQRS.formModule.fillServiceOptions();
    });
  },

  /* ————————————————————————
     CARGAR OPCIONES DE SERVICIO
  ———————————————————————— */
  fillServiceOptions: function() {
    var $select = $('#caseServicio');
    $select.find('option:not(:first)').remove();

    Object.keys(FPQRS.data.servicios).sort().forEach(function(servicio) {
      $select.append('<option value="' + servicio + '">' + servicio + '</option>');
    });
  },

  /* ————————————————————————
     EVENTOS
  ———————————————————————— */
  bindEvents: function() {
    var self = FPQRS.formModule;

    // Cambio de servicio → cargar categorías
    $('#caseServicio').on('change', function() {
      var servicio = $(this).val();
      self.loadCategorias(servicio);
    });

    // Cambio de categoría → cargar subcategorías
    $('#caseCate').on('change', function() {
      var cate = $(this).val();
      self.loadSubcategorias(cate);
    });

    // Submit del formulario
    $('#fpqrsForm').on('submit', function(e) {
      e.preventDefault();
      if (self.validateForm()) {
        self.submitForm();
      }
    });

    // Dropzone: clic abre selector de archivo
    $('#dropzone').on('click', function() {
      $('#fileInput').click();
    });
    $('#dropzone').on('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $('#fileInput').click();
      }
    });

    // Drag over
    $('#dropzone').on('dragover dragenter', function(e) {
      e.preventDefault();
      $(this).addClass('drag-over');
    });
    $('#dropzone').on('dragleave drop', function(e) {
      e.preventDefault();
      $(this).removeClass('drag-over');
      if (e.type === 'drop') {
        var files = e.originalEvent.dataTransfer.files;
        self.handleFiles(files);
      }
    });

    // Input de archivo
    $('#fileInput').on('change', function() {
      self.handleFiles(this.files);
      $(this).val(''); // Resetear para poder subir el mismo archivo de nuevo
    });

    // Eliminar archivo de la lista
    $(document).on('click', '.fi-remove', function() {
      var idx = parseInt($(this).data('index'));
      self.removeFile(idx);
    });

    // Checkbox de tratamiento de datos
    $('#caseTerminos').on('change', function() {
      var aceptado = $(this).is(':checked');
      $('#btnSubmit').prop('disabled', !aceptado);
      if (aceptado) {
        $('#terminosWrap').removeClass('is-invalid');
        $('#caseTerminosError').text('');
      }
    });
    // Inicialmente deshabilitado hasta aceptar términos
    $('#btnSubmit').prop('disabled', true);

    // Validación en tiempo real de campos
    $('#caseNombre, #caseCorreo, #caseCelular, #caseDescripcion').on('blur', function() {
      self.validateField($(this));
    });
  },

  /* ————————————————————————
     CATEGORÍAS DINÁMICAS
  ———————————————————————— */
  loadCategorias: function(servicio) {
    var $select = $('#caseCate');
    var $subSelect = $('#caseSubcate');

    // Resetear
    $select.html('<option value="">Seleccionar categoría...</option>').prop('disabled', true);
    $subSelect.html('<option value="">Seleccionar subcategoría...</option>').prop('disabled', true);

    if (!servicio || !FPQRS.data.servicios[servicio]) return;

    var categorias = FPQRS.data.servicios[servicio];
    categorias.forEach(function(cat) {
      $select.append('<option value="' + cat + '">' + cat + '</option>');
    });
    $select.prop('disabled', false);
  },

  loadSubcategorias: function(categoria) {
    var $select = $('#caseSubcate');
    $select.html('<option value="">Seleccionar subcategoría...</option>').prop('disabled', true);

    if (!categoria || !FPQRS.data.subcategorias[categoria]) return;

    var subcats = FPQRS.data.subcategorias[categoria];
    subcats.forEach(function(sub) {
      $select.append('<option value="' + sub + '">' + sub + '</option>');
    });
    $select.prop('disabled', false);
  },

  /* ————————————————————————
     MANEJO DE ARCHIVOS
  ———————————————————————— */
  handleFiles: function(files) {
    var self = FPQRS.formModule;
    var allowed = ['application/pdf', 'image/jpeg', 'image/png',
                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    Array.from(files).forEach(function(file) {
      // Validar cantidad
      if (self.state.archivos.length >= self.state.maxArchivos) {
        FPQRS.utils.toast('Máximo ' + self.state.maxArchivos + ' archivos permitidos.', 'warning');
        return;
      }
      // Validar tipo
      if (allowed.indexOf(file.type) === -1) {
        FPQRS.utils.toast('Tipo no permitido: ' + file.name + '. Use PDF, JPG, PNG o DOCX.', 'error');
        return;
      }
      // Validar tamaño
      if (file.size > self.state.maxSizeMB * 1024 * 1024) {
        FPQRS.utils.toast('Archivo muy grande: ' + file.name + '. Máximo ' + self.state.maxSizeMB + ' MB.', 'error');
        return;
      }
      // Verificar duplicado
      var existe = self.state.archivos.some(function(a) {
        return a.name === file.name && a.size === file.size;
      });
      if (existe) {
        FPQRS.utils.toast('El archivo ' + file.name + ' ya fue agregado.', 'warning');
        return;
      }

      self.state.archivos.push(file);
    });

    self.renderFilePreviews();
  },

  renderFilePreviews: function() {
    var $container = $('#filesPreview').empty();
    var self = FPQRS.formModule;

    if (self.state.archivos.length === 0) {
      $container.append('<p class="text-muted small mb-0">Sin archivos adjuntados.</p>');
      return;
    }

    self.state.archivos.forEach(function(file, i) {
      var size = (file.size / 1024).toFixed(1) + ' KB';
      var icon = file.type === 'application/pdf' ? 'bi-file-pdf' :
                 file.type.startsWith('image/')  ? 'bi-file-image' : 'bi-file-earmark';
      var safeName = $('<div>').text(file.name).html();

      $container.append(
        '<div class="file-preview-item">' +
          '<i class="bi ' + icon + ' text-primary"></i>' +
          '<span class="fi-name">' + safeName + '</span>' +
          '<span class="fi-size">' + size + '</span>' +
          '<button type="button" class="fi-remove" data-index="' + i + '" title="Eliminar" aria-label="Eliminar archivo ' + safeName + '">' +
            '<i class="bi bi-x-circle-fill"></i>' +
          '</button>' +
        '</div>'
      );
    });
  },

  removeFile: function(index) {
    FPQRS.formModule.state.archivos.splice(index, 1);
    FPQRS.formModule.renderFilePreviews();
    FPQRS.utils.toast('Archivo eliminado.', 'info', 1500);
  },

  /* ————————————————————————
     VALIDACIÓN
  ———————————————————————— */
  validateField: function($field) {
    var val = $field.val().trim();
    var id  = $field.attr('id');
    var ok  = true;
    var msg = '';

    var mensajesObligatorio = {
      caseIdType:      'Seleccione el tipo de identificación',
      caseIdNum:        'El número de identificación es obligatorio',
      caseNombre:       'El nombre completo es obligatorio',
      caseCorreo:       'El correo es obligatorio',
      caseCelular:      'El celular es obligatorio',
      caseTipo:         'Seleccione el tipo de caso',
      caseServicio:     'Seleccione el servicio',
      caseCate:         'Seleccione la categoría',
      caseSubcate:      'Seleccione la subcategoría',
      caseDescripcion:  'La descripción es obligatoria'
    };

    if ($field.prop('required') && !val) {
      ok = false; msg = mensajesObligatorio[id] || 'Este campo es obligatorio.';
    } else if (id === 'caseCorreo' && val) {
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) { ok = false; msg = 'Ingrese un correo válido.'; }
    } else if (id === 'caseCelular' && val) {
      if (!/^3\d{9}$/.test(val)) { ok = false; msg = 'Celular debe tener 10 dígitos y empezar por 3.'; }
    } else if (id === 'caseDescripcion' && val && val.length < 30) {
      ok = false; msg = 'Describa con más detalle (mínimo 30 caracteres).';
    }

    var $feedback = $field.siblings('.invalid-feedback');
    if (!$feedback.length) {
      $feedback = $field.closest('.input-group').siblings('.invalid-feedback');
    }

    if (ok) {
      $field.removeClass('is-invalid').addClass('is-valid');
      $field.attr('aria-invalid', 'false');
      $feedback.text('');
    } else {
      $field.removeClass('is-valid').addClass('is-invalid');
      $field.attr('aria-invalid', 'true');
      $feedback.text(msg);
    }
    return ok;
  },

  validateForm: function() {
    var ok = true;
    var self = FPQRS.formModule;

    // Campos requeridos
    var campos = ['#caseIdType', '#caseIdNum', '#caseNombre', '#caseCorreo',
                  '#caseCelular', '#caseTipo', '#caseServicio', '#caseCate', '#caseSubcate', '#caseDescripcion'];
    campos.forEach(function(sel) {
      var $f = $(sel);
      if (!self.validateField($f)) ok = false;
    });

    // Términos
    if (!$('#caseTerminos').is(':checked')) {
      $('#terminosWrap').addClass('is-invalid');
      $('#caseTerminosError').text('Debe aceptar el tratamiento de datos personales para continuar');
      ok = false;
    } else {
      $('#terminosWrap').removeClass('is-invalid');
      $('#caseTerminosError').text('');
    }

    if (!ok) {
      // Scroll al primer error
      var $first = $('.is-invalid:first');
      if ($first.length) {
        $('html,body').animate({ scrollTop: $first.offset().top - 100 }, 300);
      }
    }

    return ok;
  },

  /* ————————————————————————
     SUBMIT (SIMULADO)
  ———————————————————————— */
  submitForm: function() {
    var radicado = FPQRS.utils.generarRadicado();

    FPQRS.utils.showLoading();

    // Simular envío al servidor (1.5s de delay)
    setTimeout(function() {
      FPQRS.utils.hideLoading();

      // Crear el nuevo caso en memoria
      var nuevoCaso = {
        id:            radicado,
        fechaRadicado: new Date().toISOString(),
        tipo:          $('#caseTipo').val(),
        servicio:      $('#caseServicio').val(),
        categoria:     $('#caseCate').val(),
        subcategoria:  $('#caseSubcate').val(),
        asociado: {
          nombre:       $('#caseNombre').val(),
          identificacion: $('#caseIdType').val() + ' ' + $('#caseIdNum').val(),
          correo:       $('#caseCorreo').val(),
          celular:      $('#caseCelular').val(),
          direccion:    $('#caseDireccion').val()
        },
        responsable:   FPQRS.data.responsables[Math.floor(Math.random() * FPQRS.data.responsables.length)],
        area:          'Atención al Asociado',
        prioridad:     'Normal',
        estado:        'Radicado',
        canal:         'Portal Web',
        slaHoras:      24,
        limiteSLA:     new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        tipoCausa:     '',
        descripcion:   $('#caseDescripcion').val(),
        semaforo:      'En tiempo',
        comentarios:   [],
        adjuntos:      FPQRS.formModule.state.archivos.map(function(f) {
                         return { nombre: f.name, tamaño: (f.size/1024).toFixed(0) + ' KB', fecha: new Date().toISOString() };
                       }),
        historial:     [{ fecha: new Date().toISOString(), accion: 'Caso radicado', usuario: 'Portal Web', detalle: 'Canal: Portal Web' }]
      };

      FPQRS.data.casos.unshift(nuevoCaso);

      // Mostrar modal de éxito
      $('#modalRadicado').text(radicado);
      $('#modalCorreo').text($('#caseCorreo').val());
      var modalEl = document.getElementById('modalSuccess');
      var modal   = new bootstrap.Modal(modalEl);
      modal.show();

      // Reset del formulario
      $('#fpqrsForm')[0].reset();
      FPQRS.formModule.state.archivos = [];
      FPQRS.formModule.renderFilePreviews();
      $('#caseCate, #caseSubcate').html('<option value="">—</option>').prop('disabled', true);
      $('.is-valid').removeClass('is-valid');
      $('#btnSubmit').prop('disabled', true);

    }, 1500);
  }
};

/* ——————————————————————————
   INICIALIZAR al cargar el DOM
—————————————————————————— */
$(function() {
  if ($('#fpqrsForm').length) {
    FPQRS.formModule.init();
  }
});
