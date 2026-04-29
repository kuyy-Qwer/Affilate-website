import { Moon, Sun, Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function DarkModeInfo({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Info size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">
            Mode Tampilan: {isDarkMode ? 'Gelap' : 'Terang'}
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Anda sedang menggunakan <strong>mode {isDarkMode ? 'gelap' : 'terang'}</strong>. 
            Klik tombol {isDarkMode ? <Sun size={14} className="inline" /> : <Moon size={14} className="inline" />} di header atau sidebar untuk beralih ke mode {isDarkMode ? 'terang' : 'gelap'}.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
