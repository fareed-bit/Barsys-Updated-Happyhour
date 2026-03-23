    // ---- Intersection Observer for fade-up animations ----
    (function () {
      var fadeEls = document.querySelectorAll('.fade-up');
      if (!fadeEls.length) return;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      fadeEls.forEach(function (el) { obs.observe(el); });
    })();

    // ---- Product image gallery thumbnails (video + image swap) ----
    (function () {
      document.querySelectorAll('.product-card__thumbs').forEach(function (thumbsContainer) {
        var galleryId = thumbsContainer.getAttribute('data-gallery');
        var mainFrame = document.getElementById(galleryId);
        var video = mainFrame.querySelector('video');
        var videoHTML = video ? video.outerHTML : '';
        var thumbs = thumbsContainer.querySelectorAll('.product-card__thumb');

        thumbs.forEach(function (thumb, index) {
          thumb.addEventListener('click', function () {
            thumbs.forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');

            if (index === 0 && videoHTML) {
              // First thumb = show video again
              var existingImg = mainFrame.querySelector('img.gallery-img');
              if (existingImg) {
                mainFrame.innerHTML = videoHTML;
                var newVideo = mainFrame.querySelector('video');
                if (newVideo) newVideo.play().catch(function(){});
              }
            } else {
              // Other thumbs = show static image
              var src = thumb.querySelector('img').getAttribute('src');
              if (video) {
                var v = mainFrame.querySelector('video');
                if (v) v.pause();
              }
              var existingImg = mainFrame.querySelector('img.gallery-img');
              if (existingImg) {
                existingImg.setAttribute('src', src);
              } else {
                var v = mainFrame.querySelector('video');
                if (v) v.style.display = 'none';
                var img = document.createElement('img');
                img.className = 'gallery-img';
                img.src = src;
                img.alt = thumb.querySelector('img').alt;
                mainFrame.appendChild(img);
              }
            }
          });
        });
      });
    })();

    // ---- Color swatch / dot selection ----
    (function () {
      var BASE = 'https://barsys-store.saleor.cloud/media/products/';

      // Image sets per product per color
      var VARIANTS = {
        'gallery-360': {
          black: [
            BASE + 'Main_Image1_b31648f6.png',
            BASE + 'Image2_613b7767_33bf5be8.webp',
            BASE + 'Image3_2f35e807_57b5eb11.webp',
            BASE + 'Image4_cb3ec3c8_f251f005.webp',
            BASE + 'Image5_2c72140d_6577db04.webp'
          ],
          white: [
            BASE + 'white_barsys_360_1c43c813.png',
            BASE + '2_66a9270b.png',
            BASE + '3_33d2a5f6.png',
            BASE + '4_2ddf6431.png',
            BASE + '5_1e044bd8.png'
          ]
        },
        'gallery-coaster': {
          black: [
            BASE + '1_94eabb2c.png',
            BASE + '2_a7e60387.png',
            BASE + '3_e505a8b0.png',
            BASE + '4_5e95cab0.png',
            BASE + '5_3e77291b.png'
          ],
          silver: [
            BASE + '1_d6247766.png',
            BASE + '2_372ad2e0.png',
            BASE + '3_27a3d700.png',
            BASE + '4_0404126c.png',
            BASE + '5_fd07cf27.png'
          ]
        }
      };

      document.querySelectorAll('.product-card__colors').forEach(function (colorRow) {
        var card = colorRow.closest('.product-card');
        var thumbsContainer = card.querySelector('.product-card__thumbs');
        var galleryId = thumbsContainer ? thumbsContainer.getAttribute('data-gallery') : null;
        var dots = colorRow.querySelectorAll('.product-card__color-dot');

        dots.forEach(function (dot) {
          dot.addEventListener('click', function () {
            // Swap active dot
            dots.forEach(function (d) { d.classList.remove('active'); });
            dot.classList.add('active');

            if (!galleryId || !VARIANTS[galleryId]) return;

            // Determine which color key this dot represents
            var colorKey = null;
            ['black', 'white', 'silver'].forEach(function (c) {
              if (dot.classList.contains('product-card__color-dot--' + c)) colorKey = c;
            });
            if (!colorKey || !VARIANTS[galleryId][colorKey]) return;

            var images = VARIANTS[galleryId][colorKey];
            var thumbEls = thumbsContainer.querySelectorAll('.product-card__thumb');
            var mainFrame = document.getElementById(galleryId);

            // Update thumbnails
            thumbEls.forEach(function (thumb, i) {
              if (images[i]) {
                var img = thumb.querySelector('img');
                if (img) {
                  img.src = images[i];
                }
              }
            });

            // Reset gallery to first image (main frame)
            thumbEls.forEach(function (t) { t.classList.remove('active'); });
            if (thumbEls[0]) thumbEls[0].classList.add('active');

            // Show first color image in main frame
            var video = mainFrame.querySelector('video');
            if (video) {
              video.pause();
              video.style.display = 'none';
            }
            var existingImg = mainFrame.querySelector('img.gallery-img');
            if (existingImg) {
              existingImg.src = images[0];
              existingImg.style.display = '';
            } else {
              var newImg = document.createElement('img');
              newImg.className = 'gallery-img';
              newImg.src = images[0];
              newImg.alt = dot.getAttribute('title') + ' color variant';
              mainFrame.appendChild(newImg);
            }
          });
        });
      });
    })();

    // ---- Mobile hamburger ----
    (function () {
      var hamburger = document.querySelector('.nav__hamburger');
      var navLinks = document.querySelector('.nav__links');
      if (!hamburger || !navLinks) return;
      hamburger.addEventListener('click', function () {
        var expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !expanded);
        navLinks.classList.toggle('nav__links--open');
      });
    })();

    // ---- Sticky nav background on scroll ----
    (function () {
      var nav = document.querySelector('.nav');
      if (!nav) return;
      window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
          nav.classList.add('nav--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
        }
      });
    })();
