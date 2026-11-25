import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Percent, DollarSign, ArrowRightLeft, Delete, RefreshCw, Layers } from 'lucide-react';
import { formatRupiah } from '../services/printer';

export const CalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'standard' | 'margin' | 'change' | 'tax'>('standard');

  // Standard Calculator State
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [memory, setMemory] = useState<number>(0);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Business Utilities State
  // 1. Margin & Profit
  const [costPrice, setCostPrice] = useState<number>(10000);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(25);

  // 2. Change & Bill Splitter
  const [totalBill, setTotalBill] = useState<number>(78500);
  const [paidCash, setPaidCash] = useState<number>(100000);

  // 3. Tax Splitter
  const [grossWithTax, setGrossWithTax] = useState<number>(110000);
  const [taxPercent, setTaxPercent] = useState<number>(11);

  // Standard Calc Functions
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

  const clearEntry = () => {
    setDisplay('0');
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    setDisplay((val * -1).toString());
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

  const evaluateEquation = (eqStr: string): number => {
    try {
      const clean = eqStr.replace(/×/g, '*').replace(/÷/g, '/');
      return Function(`"use strict"; return (${clean})`)();
    } catch {
      return 0;
    }
  };

  const calculateResult = () => {
    if (!equation) return;
    const fullEq = equation + ' ' + display;
    const result = evaluateEquation(fullEq);
    setEquation(fullEq + ' =');
    setDisplay(result.toString());
    setWaitingForOperand(true);
  };

  const handlePercentage = () => {
    const val = parseFloat(display);
    setDisplay((val / 100).toString());
  };

  const handleSquareRoot = () => {
    const val = parseFloat(display);
    if (val < 0) {
      setDisplay('Error');
    } else {
      setDisplay(Math.sqrt(val).toString());
    }
    setWaitingForOperand(true);
  };

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'standard') return;

      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDecimal();
      } else if (e.key === '+') {
        performOperation('+');
      } else if (e.key === '-') {
        performOperation('-');
      } else if (e.key === '*') {
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Escape') {
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation, waitingForOperand, activeTab]);

  // Margin Calculations
  const calculatedSellingPrice = Math.round(costPrice / (1 - targetMarginPercent / 100));
  const profitPerItem = calculatedSellingPrice - costPrice;

  // Change Breakdown
  const changeAmount = Math.max(0, paidCash - totalBill);

  const calculateMoneyDenominations = (amount: number) => {
    const denoms = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];
    let rem = amount;
    const breakdown: { [key: number]: number } = {};

    for (const d of denoms) {
      if (rem >= d) {
        const count = Math.floor(rem / d);
        breakdown[d] = count;
        rem %= d;
      }
    }
    return breakdown;
  };

  const changeBreakdown = calculateMoneyDenominations(changeAmount);

  // Tax Calculations
  const baseDPP = Math.round(grossWithTax / (1 + taxPercent / 100));
  const taxNominal = grossWithTax - baseDPP;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <CalcIcon className="w-6 h-6 text-amber-800" />
            <span>Kalkulator Toko & Finansial Supermarket</span>
          </h1>
          <p className="text-xs text-stone-500">
            Alat bantu hitung matematika cepat, simulasi margin laba, PPN 11%, dan pecahan uang kembalian kasir.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('standard')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'standard'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Kalkulator Standar & Memori
        </button>
        <button
          onClick={() => setActiveTab('margin')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'margin'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Margin Laba & Harga Jual
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'change'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Hitung Pecahan Kembalian Kasir
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'tax'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Hitung PPN 11% / Tax Splitter
        </button>
      </div>

      {/* TAB 1: Standard Calculator */}
      {activeTab === 'standard' && (
        <div className="w-full max-w-sm mx-auto rounded-3xl bg-[#1E293B] p-5 shadow-2xl text-white space-y-4 border border-slate-700">
          {/* Display */}
          <div className="bg-slate-900 rounded-2xl p-4 text-right space-y-1 border border-slate-800 shadow-inner">
            <div className="text-[11px] font-mono text-amber-400/80 h-5 overflow-hidden truncate">
              {equation || '\u00A0'}
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-white overflow-x-auto scrollbar-none">
              {display}
            </div>
            {memory !== 0 && (
              <div className="text-[10px] text-emerald-400 font-bold">Memory: {memory}</div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2 text-sm font-extrabold">
            {/* Memory row */}
            <button
              onClick={() => setMemory(0)}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              MC
            </button>
            <button
              onClick={() => setDisplay(memory.toString())}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              MR
            </button>
            <button
              onClick={() => setMemory(memory + parseFloat(display))}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              M+
            </button>
            <button
              onClick={() => setMemory(memory - parseFloat(display))}
              className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              M-
            </button>

            {/* Clear & operations row */}
            <button
              onClick={clearAll}
              className="py-3 rounded-xl bg-red-900/80 hover:bg-red-800 text-red-200"
            >
              AC
            </button>
            <button
              onClick={clearEntry}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              CE
            </button>
            <button
              onClick={backspace}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              onClick={() => performOperation('÷')}
              className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
            >
              ÷
            </button>

            {/* Numbers row 1 */}
            <button
              onClick={() => inputDigit('7')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              7
            </button>
            <button
              onClick={() => inputDigit('8')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              8
            </button>
            <button
              onClick={() => inputDigit('9')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              9
            </button>
            <button
              onClick={() => performOperation('×')}
              className="py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
            >
              ×
            </button>

            {/* Numbers row 2 */}
            <button
              onClick={() => inputDigit('4')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              4
            </button>
            <button
              onClick={() => inputDigit('5')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              5
            </button>
            <button
              onClick={() => inputDigit('6')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              6
            </button>
            <button
              onClick={() => performOperation('-')}
              className="py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
            >
              -
            </button>

            {/* Numbers row 3 */}
            <button
              onClick={() => inputDigit('1')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              1
            </button>
            <button
              onClick={() => inputDigit('2')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              2
            </button>
            <button
              onClick={() => inputDigit('3')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              3
            </button>
            <button
              onClick={() => performOperation('+')}
              className="py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
            >
              +
            </button>

            {/* Numbers row 4 */}
            <button
              onClick={toggleSign}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              ±
            </button>
            <button
              onClick={() => inputDigit('0')}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              0
            </button>
            <button
              onClick={inputDecimal}
              className="py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white"
            >
              .
            </button>
            <button
              onClick={calculateResult}
              className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black"
            >
              =
            </button>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-1">
            Mendukung ketikan keyboard (Angka, +, -, *, /, Enter, Backspace)
          </div>
        </div>
      )}

      {/* TAB 2: Profit Margin Calculator */}
      {activeTab === 'margin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm border-b border-stone-100 pb-2">
              Input Simulasi Harga & Margin
            </h3>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Harga Modal / HPP Produk (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-bold">Rp</span>
                <input
                  type="number"
                  value={costPrice || ''}
                  onChange={e => setCostPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Target Margin Laba Bersih (%)
              </label>
              <div className="relative">
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">%</span>
                <input
                  type="number"
                  value={targetMarginPercent || ''}
                  onChange={e => setTargetMarginPercent(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 pl-3 pr-8 py-2 text-xs font-bold focus:outline-none focus:border-amber-700"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#2D1B14] text-white shadow-xl space-y-4 flex flex-col justify-between">
            <h3 className="font-extrabold text-amber-300 text-sm border-b border-amber-900/60 pb-2">
              Hasil Rekomendasi Penetapan Harga
            </h3>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-stone-300">Harga Jual Rekomendasi Toko</div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  {formatRupiah(calculatedSellingPrice)}
                </div>
              </div>

              <div className="p-3 bg-stone-900/60 rounded-xl border border-stone-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-400">Modal HPP</span>
                  <span className="font-bold">{formatRupiah(costPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Untung Bersih per Pcs</span>
                  <span className="font-bold text-emerald-400">+{formatRupiah(profitPerItem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Persentase Margin</span>
                  <span className="font-bold text-amber-300">{targetMarginPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Change Calculator & Denomination Breakdown */}
      {activeTab === 'change' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm border-b border-stone-100 pb-2">
              Input Pembayaran Transaksi
            </h3>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Total Tagihan Belanja (Rp)</label>
              <input
                type="number"
                value={totalBill || ''}
                onChange={e => setTotalBill(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs font-bold focus:outline-none focus:border-amber-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Uang Diterima dari Pembeli (Rp)</label>
              <input
                type="number"
                value={paidCash || ''}
                onChange={e => setPaidCash(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs font-bold focus:outline-none focus:border-amber-700"
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-stone-800 space-y-1">
              <div className="text-xs font-bold">Nominal Uang Kembalian</div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {formatRupiah(changeAmount)}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm border-b border-stone-100 pb-2">
              Rincian Lembar Pecahan Uang Rupiah
            </h3>

            <div className="space-y-2">
              {Object.keys(changeBreakdown).length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Uang pas (tidak ada kembalian).
                </div>
              ) : (
                Object.entries(changeBreakdown)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([denom, count]) => (
                    <div
                      key={denom}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold"
                    >
                      <span className="text-stone-700">Pecahan {formatRupiah(Number(denom))}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-mono">
                        {count} Lembar / Koin
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Tax 11% Splitter */}
      {activeTab === 'tax' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-sm border-b border-stone-100 pb-2">
              Input Nilai Bruto Termasuk PPN
            </h3>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Total Penjualan Kotor (Termasuk PPN) Rp
              </label>
              <input
                type="number"
                value={grossWithTax || ''}
                onChange={e => setGrossWithTax(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs font-bold focus:outline-none focus:border-amber-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Tarif Pajak PPN (%)</label>
              <input
                type="number"
                value={taxPercent || ''}
                onChange={e => setTaxPercent(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs font-bold focus:outline-none focus:border-amber-700"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#1E293B] text-white shadow-xl space-y-4">
            <h3 className="font-extrabold text-sky-400 text-sm border-b border-slate-700 pb-2">
              Hasil Pemisahan DPP Dasar & PPN
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Dasar Pengenaan Pajak (DPP Bersih)</div>
                <div className="text-xl font-black text-white font-mono">{formatRupiah(baseDPP)}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Nominal Pajak PPN ({taxPercent}%)</div>
                <div className="text-xl font-black text-amber-400 font-mono">{formatRupiah(taxNominal)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
