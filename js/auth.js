/**
 * GestorFPQRS — auth.js
 * Módulo de Autenticación: Login y Registro
 * Requiere: jQuery, main.js
 */

FPQRS.authModule = {

  /* ————————————————————————
     INICIALIZACIÓN
  ———————————————————————— */
  init: function() {
    // Cargar usuarios del JSON antes de cualquier operación
    FPQRS.data.load().then(function() {
      FPQRS.authModule.bindLoginEvents();
      FPQRS.authModule.bindRegisterEvents();
      FPQRS.authModule.bindDemoAccounts();
      FPQRS.authModule.bindTabSwitch();
    });

    // Si ya hay sesión, redirigir directamente a la bandeja
    var session = FPQRS.auth.getSession();
    if (session && session.correo) {
      window.location.href = 'inbox.html';
    }
  },

  /* ————————————————————————
     EVENTOS DE LOGIN
  ———————————————————————— */
  bindLoginEvents: function() {

    $('#loginForm').on('submit', function(e) {
      e.preventDefault();
      FPQRS.authModule.handleLogin();
    });

    // Mostrar/ocultar contraseña
    $('#togglePasswordLogin').on('click', function() {
      var $input = $('#loginPassword');
      var esTexto = $input.attr('type') === 'text';
      $input.attr('type', esTexto ? 'password' : 'text');
      $(this).find('i')
        .toggleClass('bi-eye', !esTexto)
        .toggleClass('bi-eye-slash', esTexto);
    });

    // Recuperación de contraseña (no disponible en esta demostración)
    $('#btnForgotPassword').on('click', function() {
      FPQRS.utils.toast('Contacte a un administrador para restablecer su contraseña.', 'info', 3000);
    });
  },

  handleLogin: function() {
    var correo   = $('#loginEmail').val().trim().toLowerCase();
    var password = $('#loginPassword').val();
    var recordar = $('#rememberMe').is(':checked');

    // Validación básica
    if (!correo || !password) {
      FPQRS.authModule.showLoginError('Complete todos los campos.');
      return;
    }

    FPQRS.utils.showLoading();

    // Simulamos latencia de red (500ms)
    setTimeout(function() {
      FPQRS.utils.hideLoading();

      // Buscar usuario en los datos cargados
      var usuario = FPQRS.data.usuarios.find(function(u) {
        return u.correo.toLowerCase() === correo && u.password === password;
      });

      if (usuario) {
        // Guardar sesión
        var session = {
          id:     usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol:    usuario.rol,
          avatar: usuario.avatar,
          recordar: recordar,
          timestamp: Date.now()
        };
        FPQRS.utils.storage.set('session', session);
        FPQRS.utils.toast('¡Bienvenido, ' + usuario.nombre + '!', 'success');

        // Pequeño delay para mostrar el toast antes de redirigir
        setTimeout(function() {
          window.location.href = 'inbox.html';
        }, 600);

      } else {
        FPQRS.authModule.showLoginError('Correo o contraseña incorrectos. Verifique sus datos.');
        // Shake animation en el formulario
        $('#loginForm').addClass('shake');
        setTimeout(function() { $('#loginForm').removeClass('shake'); }, 500);
      }
    }, 500);
  },

  showLoginError: function(msg) {
    $('#loginError').text(msg).removeClass('d-none');
    setTimeout(function() { $('#loginError').addClass('d-none'); }, 4000);
  },

  /* ————————————————————————
     CUENTAS DE DEMO
  ———————————————————————— */
  bindDemoAccounts: function() {
    // Al hacer clic en una fila de cuentas demo, autocompleta el formulario
    $(document).on('click', '.demo-row', function() {
      var correo   = $(this).data('email');
      var password = $(this).data('password');
      $('#loginEmail').val(correo);
      $('#loginPassword').val(password).attr('type', 'password');
      // Feedback visual
      $('.demo-row').removeClass('demo-row-selected');
      $(this).addClass('demo-row-selected');
      FPQRS.utils.toast('Credenciales cargadas. Presione "Ingresar".', 'info', 2000);
    });

    // Permitir activar la fila con teclado (Enter / espacio)
    $(document).on('keydown', '.demo-row', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(this).trigger('click');
      }
    });

    // Botón de copiar correo (no debe disparar el autocompletado de la fila)
    $(document).on('click', '.dac-copy', function(e) {
      e.stopPropagation();
      var correo = $(this).data('copy-email');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(correo);
      }
      FPQRS.utils.toast('Correo copiado: ' + correo, 'info', 1500);
    });
  },

  /* ————————————————————————
     CAMBIO ENTRE TABS LOGIN / REGISTRO
  ———————————————————————— */
  bindTabSwitch: function() {
    $(document).on('click', '[data-switch-tab]', function(e) {
      e.preventDefault();
      var target = $(this).data('switch-tab');
      // Ocultar todos los paneles
      $('.auth-panel').addClass('d-none');
      // Mostrar el panel destino
      $('#' + target).removeClass('d-none');
    });
  },

  /* ————————————————————————
     EVENTOS DE REGISTRO
  ———————————————————————— */
  bindRegisterEvents: function() {

    $('#registerForm').on('submit', function(e) {
      e.preventDefault();
      FPQRS.authModule.handleRegister();
    });

    // Toggle contraseña en registro
    $('#togglePasswordReg').on('click', function() {
      var $input = $('#regPassword');
      var esTexto = $input.attr('type') === 'text';
      $input.attr('type', esTexto ? 'password' : 'text');
      $(this).find('i')
        .toggleClass('bi-eye', !esTexto)
        .toggleClass('bi-eye-slash', esTexto);
    });

    // Validación de contraseña en tiempo real
    $('#regPassword').on('input', function() {
      FPQRS.authModule.validatePasswordStrength($(this).val());
    });

    // Verificación de que las contraseñas coincidan
    $('#regPasswordConfirm').on('input', function() {
      var pass    = $('#regPassword').val();
      var confirm = $(this).val();
      if (confirm && pass !== confirm) {
        $(this).addClass('is-invalid').removeClass('is-valid');
      } else if (confirm) {
        $(this).removeClass('is-invalid').addClass('is-valid');
      }
    });
  },

  handleRegister: function() {
    var nombre   = $('#regNombre').val().trim();
    var correo   = $('#regEmail').val().trim().toLowerCase();
    var password = $('#regPassword').val();
    var confirm  = $('#regPasswordConfirm').val();
    var rol      = $('#regRol').val();
    var terminos = $('#regTerminos').is(':checked');

    // Validaciones
    if (!nombre || !correo || !password || !confirm || !rol) {
      FPQRS.authModule.showRegisterError('Complete todos los campos obligatorios.');
      return;
    }
    if (password !== confirm) {
      FPQRS.authModule.showRegisterError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      FPQRS.authModule.showRegisterError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!terminos) {
      FPQRS.authModule.showRegisterError('Debe aceptar los términos y condiciones.');
      return;
    }

    // Verificar si el correo ya existe
    var existe = FPQRS.data.usuarios.find(function(u) {
      return u.correo.toLowerCase() === correo;
    });
    if (existe) {
      FPQRS.authModule.showRegisterError('Este correo ya está registrado en el sistema.');
      return;
    }

    FPQRS.utils.showLoading();

    setTimeout(function() {
      FPQRS.utils.hideLoading();

      // Crear nuevo usuario en memoria (simulado, no persiste entre recargas completas)
      var nuevoUsuario = {
        id:     FPQRS.data.usuarios.length + 1,
        nombre: nombre,
        correo: correo,
        password: password,
        rol:    rol,
        avatar: nombre.split(' ').map(function(w) { return w[0]; }).join('').slice(0,2).toUpperCase()
      };
      FPQRS.data.usuarios.push(nuevoUsuario);

      // Guardar sesión automáticamente
      FPQRS.utils.storage.set('session', {
        id:     nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol:    nuevoUsuario.rol,
        avatar: nuevoUsuario.avatar,
        timestamp: Date.now()
      });

      FPQRS.utils.toast('¡Registro exitoso! Bienvenido/a, ' + nombre + '.', 'success');

      setTimeout(function() {
        window.location.href = 'inbox.html';
      }, 700);

    }, 600);
  },

  showRegisterError: function(msg) {
    $('#registerError').text(msg).removeClass('d-none');
    setTimeout(function() { $('#registerError').addClass('d-none'); }, 5000);
  },

  /**
   * Indicador visual de fortaleza de contraseña
   */
  validatePasswordStrength: function(password) {
    var score = 0;
    if (password.length >= 8)    score++;
    if (/[A-Z]/.test(password))  score++;
    if (/[0-9]/.test(password))  score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    var labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
    var colors = ['', '#e53935', '#fb8c00', '#43a047', '#1976d2'];
    var widths = ['0%', '25%', '50%', '75%', '100%'];

    $('#passwordStrengthBar').css({ width: widths[score], background: colors[score] });
    $('#passwordStrengthLabel').text(score > 0 ? labels[score] : '').css('color', colors[score]);
  }
};

/* ——————————————————————————
   INICIALIZAR al cargar el DOM
—————————————————————————— */
$(function() {
  // Solo ejecutar en la página de login
  if ($('#loginForm, #registerForm').length) {
    FPQRS.authModule.init();
  }
});
