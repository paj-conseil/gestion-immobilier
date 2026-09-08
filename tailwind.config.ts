import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        green: {
          900: '#0F3D24',
          700: '#1E5631',
          600: '#2C6E3F',
          400: '#7CB342',
          100: '#E4EFE2',
        },
        stone: {
          50: '#F5F6F3',
          100: '#EEF0EB',
        },
        ink: {
          DEFAULT: '#1C241E',
          soft: '#5B665C',
        },
        line: '#DEE3DA',
        amber: {
          DEFAULT: '#B0790A',
          bg: '#FBF1DE',
        },
        brick: {
          DEFAULT: '#A8432E',
          bg: '#F8E9E5',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        s: '6px',
        m: '10px',
      },
      boxShadow: {
        pop: '0 12px 32px rgba(15,61,36,.18)',
      },
    },
  },
  plugins: [],
};

export default config;
