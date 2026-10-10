import React from 'react';
import { Sliders } from 'lucide-react';
import { DatasetSelector } from '../datasets/DatasetSelector';
import { DatasetInfo } from '../datasets/DatasetInfo';
import { DetectionSettings } from '../upload/DetectionSettings';
import { DatasetSummary, DatasetSampleSummary, ImageryValidationResponse, RasterMetadataResponse } from '../../types/imagery';
import { DetectionMethodInfo, MaskLayerMode } from '../../types/detection';

interface SidebarProps {
  datasets: DatasetSummary[];
  selectedDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  samples: DatasetSampleSummary[];
  selectedSampleId: string;
  onSelectSample: (sampleId: string) => void;
  isLoading: boolean;
  onUploadCustom: (beforeFile: File, afterFile: File) => void;
  validation: ImageryValidationResponse | null;
  beforeMeta: RasterMetadataResponse | null;
  afterMeta: RasterMetadataResponse | null;
  error: string | null;
  methods: DetectionMethodInfo[];
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  kernelSize: number;
  onKernelSizeChange: (size: number) => void;
  minComponentSize: number;
  onMinComponentSizeChange: (size: number) => void;
  maskMode: MaskLayerMode;
  onMaskModeChange: (mode: MaskLayerMode) => void;
  maskOpacity: number;
  onMaskOpacityChange: (opacity: number) => void;
  isProcessing: boolean;
  hasActiveJob: boolean;
  onRunDetection: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  samples,
  selectedSampleId,
  onSelectSample,
  isLoading,
  onUploadCustom,
  validation,
  beforeMeta,
  afterMeta,
  error,
  methods,
  selectedMethod,
  onMethodChange,
  threshold,
  onThresholdChange,
  kernelSize,
  onKernelSizeChange,
  minComponentSize,
  onMinComponentSizeChange,
  maskMode,
  onMaskModeChange,
  maskOpacity,
  onMaskOpacityChange,
  isProcessing,
  hasActiveJob,
  onRunDetection,
}) => {
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || null;
  const hasValidInputs = !!validation && validation.valid;

  return (
    <aside className="w-80 h-full bg-[#17212B] border-r border-[#34404C] flex flex-col overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="h-12 bg-[#151D26] border-b border-[#34404C] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#FF8617]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#F3F6FA]">
            Ingestion & Control
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 font-semibold">
          STAGE 3 READY
        </span>
      </div>

      {/* Sidebar Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dataset / Ingestion Selection */}
        <DatasetSelector
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={onSelectDataset}
          samples={samples}
          selectedSampleId={selectedSampleId}
          onSelectSample={onSelectSample}
          isLoading={isLoading}
          onUploadCustom={onUploadCustom}
          validation={validation}
          error={error}
        />

        {/* Rich Metadata Inspection Card */}
        {validation && (
          <DatasetInfo
            dataset={currentDataset}
            validation={validation}
            beforeMeta={beforeMeta}
            afterMeta={afterMeta}
          />
        )}

        {/* Detection Pipeline & Threshold Settings */}
        <DetectionSettings
          methods={methods}
          selectedMethod={selectedMethod}
          onMethodChange={onMethodChange}
          threshold={threshold}
          onThresholdChange={onThresholdChange}
          kernelSize={kernelSize}
          onKernelSizeChange={onKernelSizeChange}
          minComponentSize={minComponentSize}
          onMinComponentSizeChange={onMinComponentSizeChange}
          hasValidInputs={hasValidInputs}
          isProcessing={isProcessing}
          onRunDetection={onRunDetection}
          maskMode={maskMode}
          onMaskModeChange={onMaskModeChange}
          maskOpacity={maskOpacity}
          onMaskOpacityChange={onMaskOpacityChange}
          hasActiveJob={hasActiveJob}
        />
      </div>
    </aside>
  );
};
