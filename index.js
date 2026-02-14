const header = document.querySelector(".header-main");
const DETECTOR_HEIGHT = 80;

header.style.opacity = "0";
header.style.pointerEvents = "none";
header.style.transition = "opacity 0.3s ease";

document.addEventListener("mousemove", (e) => {
    if (e.clientY < DETECTOR_HEIGHT) {
        if (header.style.opacity !== "1") {
            header.style.opacity = "1";
            header.style.pointerEvents = "auto";
        }
    } else {
        if (header.style.opacity !== "0") {
            header.style.opacity = "0";
            header.style.pointerEvents = "none";
        }
    }
});

window.addEventListener("scroll", () => {
    const maxScroll = 600; 
    const scroll = Math.min(window.scrollY, maxScroll);

    const progress = scroll / maxScroll;
    const blur = progress * 40;
    const scale = 1.15 - progress * 0.15;

    const img = document.querySelector(".intro-image");
    img.style.filter = `blur(${blur}px)`;
    img.style.transform = `scale(${scale})`;
    
    if (scroll > 0) {
        header.style.opacity = "1";
        header.style.pointerEvents = "auto";
    }
});

const container = document.getElementById('main-container');
const iframe = document.getElementById('game-frame');
const playBtn = document.getElementById('play-btn');

playBtn.onclick = () => {
  iframe.style.display = 'block';

  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen(); 
  }
};

// When User leaves
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    iframe.style.display = 'none';
  }
});

// Handle close game frame message from iframe
window.addEventListener('message', (event) => {
  if (event.data.type === 'closeGameFrame') {
    iframe.style.display = 'none';
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
});

const cards = document.querySelectorAll('.character-card');

const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

cards.forEach(card => observer.observe(card));

// Observer for description paragraphs
const descriptionObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.3 }
);

const descriptionParagraphs = document.querySelectorAll('.description-paragraph');
descriptionParagraphs.forEach(paragraph => descriptionObserver.observe(paragraph));
