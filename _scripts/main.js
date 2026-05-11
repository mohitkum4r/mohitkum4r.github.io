$(function() {
  const d = new Date();
  const hours = d.getHours();
  const defaultNight = hours >= 19 || hours <= 7; // between 7pm and 7am
  
  const savedTheme = localStorage.getItem('theme');
  let isNight = false;
  
  if (savedTheme === 'night') {
    isNight = true;
  } else if (savedTheme === 'light') {
    isNight = false;
  } else {
    isNight = defaultNight;
  }

  const body = document.querySelector('body');
  const toggle = document.getElementById('toggle');
  const input = document.getElementById('switch');

  if (isNight) {
    input.checked = true;
    body.classList.add('night');
  }

  toggle.addEventListener('click', function() {
    const isChecked = input.checked;
    if (isChecked) {
      body.classList.remove('night');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.add('night');
      localStorage.setItem('theme', 'night');
    }
  });

  const introElement = document.querySelector('.intro');
  const introHeight = introElement ? introElement.offsetHeight : 0;
  const topButton = document.getElementById('top-button');
  const $topButton = $('#top-button');

  window.addEventListener(
    'scroll',
    function() {
      if (window.scrollY > introHeight) {
        $topButton.fadeIn();
      } else {
        $topButton.fadeOut();
      }
    },
    false
  );

  if (topButton) {
    topButton.addEventListener('click', function() {
      $('html, body').animate({ scrollTop: 0 }, 500);
    });
  }

  const hand = document.querySelector('.emoji.wave-hand');

  function waveOnLoad() {
    if (hand) {
      hand.classList.add('wave');
      setTimeout(function() {
        hand.classList.remove('wave');
      }, 2000);
    }
  }

  setTimeout(function() {
    waveOnLoad();
  }, 1000);

  if (hand) {
    hand.addEventListener('mouseover', function() {
      hand.classList.add('wave');
    });

    hand.addEventListener('mouseout', function() {
      hand.classList.remove('wave');
    });
  }

  window.sr = ScrollReveal({
    reset: false,
    duration: 600,
    easing: 'cubic-bezier(.694,0,.335,1)',
    scale: 1,
    viewFactor: 0.3,
  });

  if (document.querySelector('.background')) sr.reveal('.background');
  if (document.querySelector('.skills')) sr.reveal('.skills');
  if (document.querySelector('.experience')) sr.reveal('.experience', { viewFactor: 0.2 });
  if (document.querySelector('.featured-projects')) sr.reveal('.featured-projects', { viewFactor: 0.1 });
  if (document.querySelector('.other-projects')) sr.reveal('.other-projects', { viewFactor: 0.05 });
  if (document.querySelector('.writing')) sr.reveal('.writing', { viewFactor: 0.05 });
  if (document.querySelector('.post-content')) sr.reveal('.post-content', { viewFactor: 0.05 });
});
