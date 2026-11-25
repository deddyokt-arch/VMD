import React, { useState } from 'react';
import { Calculator as CalcIcon, X, Delete } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  if (!isOpen) return null;

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length > 1) setDisplay(display.slice(0, -1));
    else setDisplay('0');
  };

  const evaluateEquation = (eqStr: string): number => {
    try {
      const clean = eqStr.replace(/×/g, '*').replace(/÷/g, '/');
      return Function(`"use strict"; return (${clean})`)();
    } catch {
      return 0;
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);
    if (equation && !waitingForOperand) {
      const result = evaluateEquation(equation + ' ' + display);
      setDisplay(result.toString());
      setEquation(result + ' ' + nextOperator);
    } else {
      setEquation(inputValue + ' ' + nextOperator);
    }
    setWaitingForOperand(true);
  };

  const calculateResult = () => {
    if (!equation) return;
    const fullEq = equation + ' ' + display;
    const result = evaluateEquation(fullEq);
    setEquation(fullEq + ' =');
    setDisplay(result.toString());
    setWaitingForOperand(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xs rounded-3xl bg-[#1E293B] shadow-2xl p-5 text-white space-y-3 border border-slate-700">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
            <CalcIcon className="w-4 h-4" />
            <span>Kalkulator Cepat</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-slate-900 rounded-2xl p-3.5 text-right space-y-1 border border-slate-800 shadow-inner">
          <div className="text-[10px] font-mono text-amber-400/80 h-4 overflow-hidden truncate">
            {equation || '\u00A0'}
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white overflow-x-auto scrollbar-none">
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-1.5 text-xs font-extrabold">
          <button onClick={clearAll} className="py-2.5 rounded-xl bg-red-900/80 hover:bg-red-800 text-red-200">
            AC
          </button>
          <button onClick={backspace} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center">
            <Delete className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDisplay((parseFloat(display) / 100).toString())} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200">
            %
          </button>
          <button onClick={() => performOperation('÷')} className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white">
            ÷
          </button>

          <button onClick={() => inputDigit('7')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            7
          </button>
          <button onClick={() => inputDigit('8')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            8
          </button>
          <button onClick={() => inputDigit('9')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            9
          </button>
          <button onClick={() => performOperation('×')} className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white">
            ×
          </button>

          <button onClick={() => inputDigit('4')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            4
          </button>
          <button onClick={() => inputDigit('5')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            5
          </button>
          <button onClick={() => inputDigit('6')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            6
          </button>
          <button onClick={() => performOperation('-')} className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white">
            -
          </button>

          <button onClick={() => inputDigit('1')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            1
          </button>
          <button onClick={() => inputDigit('2')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            2
          </button>
          <button onClick={() => inputDigit('3')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            3
          </button>
          <button onClick={() => performOperation('+')} className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white">
            +
          </button>

          <button onClick={() => setDisplay((parseFloat(display) * -1).toString())} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            ±
          </button>
          <button onClick={() => inputDigit('0')} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            0
          </button>
          <button onClick={inputDecimal} className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white">
            .
          </button>
          <button onClick={calculateResult} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
            =
          </button>
        </div>
      </div>
    </div>
  );
};
