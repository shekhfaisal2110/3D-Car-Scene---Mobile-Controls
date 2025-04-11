document.getElementById('toggle-rules').addEventListener('click', () => {
    const rules = document.getElementById('game-rules');
    const btn = document.getElementById('toggle-rules');
    if (rules.classList.contains('collapsed')) {
      rules.classList.remove('collapsed');
      btn.textContent = 'Hide';
      rules.querySelector('ul').style.display = 'block';
    } else {
      rules.classList.add('collapsed');
      btn.textContent = 'Show';
      rules.querySelector('ul').style.display = 'none';
    }
  });


  