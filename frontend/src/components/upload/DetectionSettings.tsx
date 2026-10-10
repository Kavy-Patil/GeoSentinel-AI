import React from 'react';
import { 
  Cpu, 
  Sliders, 
  Play, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { DetectionMethodInfo, MaskLayerMode } from '../../types/detection';

interface DetectionSettingsProps {
  methods: DetectionMethodInfo[];
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  kernelSize: number;
  onKernelSizeChange: (size: number) => void;
  minComponentSize: number;
  onMinComponentSizeChange: (size: number) => void;
  hasValidInputs: boolean;
  isProcessing: boolean;
  onRunDetection: () => void;
  maskMode: MaskLayerMode;
  onMaskModeChange: (mode: MaskLayerMode) => void;
  maskOpacity: number;
  onMaskOpacityChange: (opacity: number) => void;
  hasActiveJob: boolean;
}

export const DetectionSettings: React.FC<DetectionSettingsProps> = ({
  methods,
  selectedMethod,
  onMethodChange,
  threshold,
  onThresholdChange,
  kernelSize,
  onKernelSizeChange,
  minComponentSize,
  onMinComponentSizeChange,
  hasValidInputs,
  isProcessing,
  onRunDetection,
  maskMode,
  onMaskModeChange,
  maskOpacity,
  onMaskOpacityChange,
  hasActiveJob,
}) => {
  const isDeepLearningAvailable = methods.find((m) => m.id === 'deep_learning')?.available || false;

  return (
    <div className="space-y-4 pt-2 border-t border-[#34404C] select-none text-xs">
      {/* 1. Detection Method Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#FF8617]" />
            Change Detection Engine
          </label>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 font-semibold">
            STAGE 3 ACTIVE
          </span>
        </div>

        <div className="space-y-2">
          {/* Classical Method */}
          <label className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors ${
            selectedMethod === 'classical'
              ? 'bg-[#151D26] border-[#FF8617] text-[#F3F6FA]'
              : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:border-[#465565]'
          }`}>
            <input
              type="radio"
              name="det_method"
              value="classical"
              checked={selectedMethod === 'classical'}
              onChange={() => onMethodChange('classical')}
              className="mt-0.5 text-[#FF8617] focus:ring-[#FF8617] bg-[#0B1118]"
            />
            <div className="text-xs">
              <div className="font-semibold text-[#F3F6FA] flex items-center gap-1.5">
                <span>Classical Spectral Differencing</span>
                <span className="text-[9px] text-[#22C55E] font-mono font-medium">● READY</span>
              </div>
              <div className="text-[10px] text-[#AAB8C6] mt-0.5">
                Normalized RGB vector diff, Otsu/custom threshold & morphological noise reduction
              </div>
            </div>
          </label>

          {/* Pretrained AI Method */}
          <label className={`flex items-start gap-2.5 p-2 rounded border transition-colors ${
            !isDeepLearningAvailable
              ? 'opacity-70 bg-[#0B1118]/50 border-[#34404C] cursor-not-allowed'
              : selectedMethod === 'deep_learning'
                ? 'bg-[#151D26] border-[#06B6D4] text-[#F3F6FA] cursor-pointer'
                : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:border-[#465565] cursor-pointer'
          }`}>
            <input
              type="radio"
              name="det_method"
              value="deep_learning"
              checked={selectedMethod === 'deep_learning'}
              disabled={!isDeepLearningAvailable}
              onChange={() => onMethodChange('deep_learning')}
              className="mt-0.5 text-[#06B6D4] focus:ring-[#06B6D4] bg-[#0B1118]"
            />
            <div className="text-xs">
              <div className="font-semibold text-[#F3F6FA] flex items-center gap-1.5">
                <span>Pretrained AI (ChangeFormer)</span>
                {isDeepLearningAvailable ? (
                  <span className="text-[9px] text-[#06B6D4] font-mono font-medium">● OPERATIONAL</span>
                ) : (
                  <span className="text-[9px] text-[#F59E0B] font-mono font-medium">○ WEIGHTS OPTIONAL</span>
                )}
              </div>
              <div className="text-[10px] text-[#AAB8C6] mt-0.5">
                {isDeepLearningAvailable
                  ? 'Transformer bi-temporal building feature matcher'
                  : 'Place changeformer_levircd.pth in data/models/ to activate DL inference.'}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 2. Threshold Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#FF8617]" />
            Change Threshold
          </label>
          <span className="font-mono text-xs font-semibold text-[#FF8617] bg-[#FF8617]/10 px-2 py-0.5 rounded border border-[#FF8617]/30">
            {threshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.02"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className="w-full accent-[#FF8617] bg-[#0B1118] h-1.5 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#AAB8C6] mt-1 font-mono">
          <span>0.0 (High Recall)</span>
          <span>0.5 (Standard)</span>
          <span>1.0 (High Precision)</span>
        </div>
      </div>

      {/* 3. Morphological & Noise Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block mb-1">
            Morphology Kernel
          </label>
          <select
            value={kernelSize}
            onChange={(e) => onKernelSizeChange(parseInt(e.target.value, 10))}
            className="w-full bg-[#0B1118] border border-[#34404C] text-[#F3F6FA] text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#FF8617] font-mono"
          >
            <option value="1">1×1 (No Morphology)</option>
            <option value="3">3×3 (Fine Filter)</option>
            <option value="5">5×5 (Medium Filter)</option>
            <option value="7">7×7 (Coarse Filter)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block mb-1">
            Min Area (Pixels)
          </label>
          <select
            value={minComponentSize}
            onChange={(e) => onMinComponentSizeChange(parseInt(e.target.value, 10))}
            className="w-full bg-[#0B1118] border border-[#34404C] text-[#F3F6FA] text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#FF8617] font-mono"
          >
            <option value="1">1 px (Keep All)</option>
            <option value="10">10 px</option>
            <option value="25">25 px (Default)</option>
            <option value="50">50 px</option>
            <option value="100">100 px (Large Only)</option>
          </select>
        </div>
      </div>

      {/* 4. Mask Layer & Opacity Controls (Active when job output exists) */}
      {hasActiveJob && (
        <div className="p-2.5 rounded bg-[#151D26] border border-[#FF8617]/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#F3F6FA] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#FF8617]" /> Mask Visualization Layer
            </span>
            <span className="text-[10px] font-mono text-[#FF8617]">{maskOpacity}% Opacity</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => onMaskModeChange('overlay')}
              className={`px-2 py-1 rounded font-medium border transition-colors ${
                maskMode === 'overlay'
                  ? 'bg-[#FF8617] text-[#0B1118] border-[#FF8617] font-bold'
                  : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
            >
              Orange #FF8617 Overlay
            </button>
            <button
              type="button"
              onClick={() => onMaskModeChange('filtered_mask')}
              className={`px-2 py-1 rounded font-medium border transition-colors ${
                maskMode === 'filtered_mask'
                  ? 'bg-[#FF8617] text-[#0B1118] border-[#FF8617] font-bold'
                  : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
            >
              Filtered Binary Mask
            </button>
            <button
              type="button"
              onClick={() => onMaskModeChange('raw_mask')}
              className={`px-2 py-1 rounded font-medium border transition-colors ${
                maskMode === 'raw_mask'
                  ? 'bg-[#FF8617] text-[#0B1118] border-[#FF8617] font-bold'
                  : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
            >
              Raw Mask (Pre-Filter)
            </button>
            <button
              type="button"
              onClick={() => onMaskModeChange('change_score')}
              className={`px-2 py-1 rounded font-medium border transition-colors ${
                maskMode === 'change_score'
                  ? 'bg-[#FF8617] text-[#0B1118] border-[#FF8617] font-bold'
                  : 'bg-[#0B1118] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA]'
              }`}
            >
              Score Heatmap (Turbo)
            </button>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            value={maskOpacity}
            onChange={(e) => onMaskOpacityChange(parseInt(e.target.value, 10))}
            className="w-full accent-[#FF8617] bg-[#0B1118] h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* 5. Run Change Detection Action Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onRunDetection}
          disabled={!hasValidInputs || isProcessing}
          className={`w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
            isProcessing
              ? 'bg-[#FF8617]/70 text-[#0B1118] cursor-wait'
              : hasValidInputs
                ? 'bg-[#FF8617] text-[#0B1118] hover:bg-[#FF8617]/90 active:scale-[0.99] cursor-pointer'
                : 'bg-[#34404C]/50 text-[#AAB8C6] cursor-not-allowed border border-[#34404C]'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Executing Detection Pipeline...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Run Change Detection
            </>
          )}
        </button>
      </div>
    </div>
  );
};
