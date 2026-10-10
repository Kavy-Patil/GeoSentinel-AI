import React, { useRef } from 'react';
import { 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon,
  Sparkles,
  Info
} from 'lucide-react';
import { DatasetSource, ImageInputState, SampleDataset } from '../../types/ui';

interface UploadPanelProps {
  source: DatasetSource;
  onSourceChange: (source: DatasetSource) => void;
  sampleDatasets: SampleDataset[];
  selectedSampleId: string;
  onSelectSample: (sampleId: string) => void;
  beforeInput: ImageInputState;
  afterInput: ImageInputState;
  onFileSelect: (type: 'before' | 'after', file: File) => void;
  validationError: string | null;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  source,
  onSourceChange,
  sampleDatasets,
  selectedSampleId,
  onSelectSample,
  beforeInput,
  afterInput,
  onFileSelect,
  validationError,
}) => {
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(type, file);
    }
  };

  const handleDrop = (type: 'before' | 'after', e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(type, file);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Dataset Source Selection */}
      <div>
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block mb-2">
          Dataset Source
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSourceChange('sample')}
            className={`px-3 py-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
              source === 'sample'
                ? 'bg-[#FF8617]/15 border-[#FF8617] text-[#FF8617] shadow-[0_0_8px_rgba(255,134,23,0.15)]'
                : 'bg-[#151D26] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sample Dataset
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('custom')}
            className={`px-3 py-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
              source === 'custom'
                ? 'bg-[#FF8617]/15 border-[#FF8617] text-[#FF8617] shadow-[0_0_8px_rgba(255,134,23,0.15)]'
                : 'bg-[#151D26] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Custom
          </button>
        </div>
      </div>

      {/* If Sample Source: Dropdown */}
      {source === 'sample' ? (
        <div className="p-3 rounded bg-[#151D26] border border-[#34404C] space-y-2">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block">
            Select Benchmark Scenario
          </label>
          <select
            value={selectedSampleId}
            onChange={(e) => onSelectSample(e.target.value)}
            className="w-full bg-[#0B1118] border border-[#34404C] text-[#F3F6FA] text-xs rounded px-2.5 py-2 focus:outline-none focus:border-[#FF8617] transition-colors"
          >
            {sampleDatasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.category})
              </option>
            ))}
          </select>
          <div className="text-[11px] text-[#AAB8C6] leading-relaxed pt-1">
            {sampleDatasets.find((s) => s.id === selectedSampleId)?.description}
          </div>
        </div>
      ) : (
        /* Custom Upload Inputs */
        <div className="space-y-3">
          {/* Before Image Upload Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-semibold text-[#AAB8C6]">
                1. Before Acquisition Image
              </span>
              {beforeInput.file && (
                <span className="text-[10px] text-[#22C55E] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
            <input
              type="file"
              ref={beforeInputRef}
              accept=".png,.jpg,.jpeg,.tif,.tiff"
              onChange={(e) => handleFileChange('before', e)}
              className="hidden"
            />
            <div
              onClick={() => beforeInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop('before', e)}
              className={`p-3 rounded border border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                beforeInput.file
                  ? 'bg-[#151D26] border-[#22C55E]/60 hover:border-[#22C55E]'
                  : 'bg-[#151D26]/60 border-[#34404C] hover:border-[#FF8617] hover:bg-[#151D26]'
              }`}
            >
              {beforeInput.file ? (
                <div className="w-full flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded bg-[#0B1118] border border-[#34404C] flex items-center justify-center text-[#22C55E] shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#F3F6FA] truncate">
                      {beforeInput.filename}
                    </div>
                    <div className="text-[10px] text-[#AAB8C6] font-mono">
                      {formatFileSize(beforeInput.fileSize)} • {beforeInput.isGeoTiff ? 'GeoTIFF' : 'Standard Raster'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#AAB8C6] mb-1.5" />
                  <span className="text-xs font-medium text-[#F3F6FA]">
                    Choose Before Image
                  </span>
                  <span className="text-[10px] text-[#AAB8C6] mt-0.5">
                    PNG, JPG, or GeoTIFF (.tif)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* After Image Upload Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-semibold text-[#AAB8C6]">
                2. After Acquisition Image
              </span>
              {afterInput.file && (
                <span className="text-[10px] text-[#22C55E] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </div>
            <input
              type="file"
              ref={afterInputRef}
              accept=".png,.jpg,.jpeg,.tif,.tiff"
              onChange={(e) => handleFileChange('after', e)}
              className="hidden"
            />
            <div
              onClick={() => afterInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop('after', e)}
              className={`p-3 rounded border border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                afterInput.file
                  ? 'bg-[#151D26] border-[#22C55E]/60 hover:border-[#22C55E]'
                  : 'bg-[#151D26]/60 border-[#34404C] hover:border-[#FF8617] hover:bg-[#151D26]'
              }`}
            >
              {afterInput.file ? (
                <div className="w-full flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded bg-[#0B1118] border border-[#34404C] flex items-center justify-center text-[#22C55E] shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#F3F6FA] truncate">
                      {afterInput.filename}
                    </div>
                    <div className="text-[10px] text-[#AAB8C6] font-mono">
                      {formatFileSize(afterInput.fileSize)} • {afterInput.isGeoTiff ? 'GeoTIFF' : 'Standard Raster'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#AAB8C6] mb-1.5" />
                  <span className="text-xs font-medium text-[#F3F6FA]">
                    Choose After Image
                  </span>
                  <span className="text-[10px] text-[#AAB8C6] mt-0.5">
                    PNG, JPG, or GeoTIFF (.tif)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Message Box */}
      {validationError && (
        <div className="p-2.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-start gap-2 text-xs text-[#EF4444]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-snug">{validationError}</div>
        </div>
      )}

      {/* GeoTIFF Stage Note */}
      <div className="p-2.5 rounded bg-[#0B1118] border border-[#34404C] flex items-start gap-2 text-[11px] text-[#AAB8C6]">
        <Info className="w-3.5 h-3.5 text-[#FF8617] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="text-[#F3F6FA] font-medium">Stage 1 Viewer Mode:</span> Standard raster preview enabled. Deep GeoTIFF raster band parsing will be powered by RasterIO in Stage 2.
        </div>
      </div>
    </div>
  );
};
