import { useTheme } from "~/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  console.log("ThemeToggle rendered with:", { theme, resolvedTheme });

  const handleToggle = () => {
    console.log("Toggle clicked, current theme:", theme, "resolved:", resolvedTheme);
    
    if (theme === "system") {
      const newTheme = resolvedTheme === "dark" ? "light" : "dark";
      console.log("Switching from system to:", newTheme);
      setTheme(newTheme);
    } else if (theme === "light") {
      console.log("Switching from light to dark");
      setTheme("dark");
    } else {
      console.log("Switching from dark to system");
      setTheme("system");
    }
  };

  const getIcon = () => {
    if (theme === "system") {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    } else if (resolvedTheme === "dark") {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }
  };

  const getTooltip = () => {
    if (theme === "system") return "System theme";
    return theme === "light" ? "Light mode" : "Dark mode";
  };

  return (
    <button
      onClick={handleToggle}
      className="relative flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
      title={getTooltip()}
    >
      {getIcon()}
      {theme === "system" && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 text-xs flex items-center justify-center">
          <span className="w-1 h-1 bg-white rounded-full"></span>
        </span>
      )}
    </button>
  );
}