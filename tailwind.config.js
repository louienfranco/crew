/* Shared browser-only theme. Load immediately after https://cdn.tailwindcss.com. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#18181b', hover: '#27272a' },
        ink: { DEFAULT: '#18181b', 2: '#3f3f46', 3: '#52525b' },
        line: { DEFAULT: '#e4e4e7', soft: '#f4f4f5' },
        page: '#fafafa', success: '#15803d', danger: '#b91c1c',
        gray: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#71717a', 500: '#52525b', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' }
      },
      fontSize: { ui: ['13px', {lineHeight: '20px'}], 'ui-title': ['15px', {lineHeight: '20px'}], 'ui-label': ['12px', {lineHeight: '18px'}] },
      spacing: { control: '32px', 'ui-gap': '8px' },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'] },
      borderRadius: { DEFAULT: '6px', sm: '4px', lg: '8px', xl: '8px', '2xl': '8px' },
      boxShadow: { card: '0 1px 3px rgb(0 0 0 / .08)', modal: '0 10px 30px rgb(0 0 0 / .16)', 'modal-xl': '0 20px 60px rgb(0 0 0 / .2)' },
      screens: { nav: '900px', 'max-nav': { max: '899.98px' } },
      keyframes: { modalIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } } },
      animation: { 'modal-in': 'modalIn .18s ease-out' }
    }
  },
  plugins: [function (api) {
    var theme = api.theme;
    api.addComponents({
      '.ui-action': {
        display: 'inline-flex', flexShrink: '0', alignItems: 'center', justifyContent: 'center',
        gap: '6px', height: theme('spacing.control'), padding: '0 12px',
        borderWidth: '1px', borderRadius: theme('borderRadius.DEFAULT'),
        fontSize: '13px', fontWeight: '500', lineHeight: '20px', whiteSpace: 'nowrap',
        transitionProperty: 'color, background-color, border-color, box-shadow, transform', transitionDuration: '150ms',
        '&:active:not(:disabled)': {transform: 'translateY(1px)'},
        '&:disabled': {cursor: 'not-allowed', opacity: '.5'}
      },
      '.ui-field': {
        display: 'block', width: '100%', minWidth: '0', height: theme('spacing.control'),
        padding: '0 12px', borderWidth: '1px', borderRadius: theme('borderRadius.DEFAULT'),
        fontSize: '13px', lineHeight: '20px', transitionProperty: 'border-color, box-shadow', transitionDuration: '150ms'
      },
      '.ui-icon-button': {
        display: 'inline-flex', flexShrink: '0', alignItems: 'center', justifyContent: 'center',
        width: theme('spacing.control'), height: theme('spacing.control'), padding: '0'
      }
    });
  }]
};
