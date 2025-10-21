
const wrapper = document.querySelector('.wrapper');
const registerLink = document.querySelector('.register-link');
const loginLink = document.querySelector('.login-link');
const btnPopup = document.querySelector('.btnLogin-popup');
const iconClose = document.querySelector('.icon-close');

registerLink.onclick = () => {
    wrapper.classList.add('active');
};

loginLink.onclick = () => {
    wrapper.classList.remove('active');
};

btnPopup.onclick = () => {
    wrapper.classList.add('active-popup');
};

iconClose.onclick = () => {
    wrapper.classList.remove('active-popup');
    wrapper.classList.remove('active');
};

  var typed = new Typed('#typed-text', {
    strings: [
      "We will help everyone."
    ],
    typeSpeed: 20,
    backSpeed: 10,
    backDelay: 6000,
    loop: true
  });
    var typed = new Typed('#typed-text2', {
    strings: [
      "Simple Steps for Finding Your Lost Items"
    ],
    typeSpeed: 20,
    backSpeed: 10,
    backDelay: 6000,
    loop: true
  });
      var typed = new Typed('#typed-text3', {
    strings: [
      "CHIPHAI"
    ],
    typeSpeed: 250,
    backSpeed: 50,
    backDelay: 8000,
    loop: true
  });