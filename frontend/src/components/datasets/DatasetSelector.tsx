import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { DatasetSummary, DatasetSampleSummary, ImageryValidationResponse } from '../../types/imagery';

interface DatasetSelectorProps {
  datasets?: DatasetSummary[];
  selectedDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
  samples: DatasetSampleSummary[];
  selectedSampleId: string;
  onSelectSample: (sampleId: string) => void;
  isLoading: boolean;
  onUploadCustom: (beforeFile: File, afterFile: File) => void;
  validation: ImageryValidationResponse | null;
  error: string | null;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  selectedDatasetId,
  onSelectDataset,
  samples,
  selectedSampleId,
  onSelectSample,
  isLoading,
  onUploadCustom,
  validation,
  error,
}) => {
  const [customBeforeFile, setCustomBeforeFile] = useState<File | null>(null);
  const [customAfterFile, setCustomAfterFile] = useState<File | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleCustomUploadTrigger = (before: File | null, after: File | null) => {
    if (before && after) {
      onUploadCustom(before, after);
    }
  };

  const handleBeforeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomBeforeFile(file);
      handleCustomUploadTrigger(file, customAfterFile);
    }
  };

  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomAfterFile(file);
      handleCustomUploadTrigger(customBeforeFile, file);
    }
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Dataset Source Tabs */}
      <div>
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block mb-2">
          Select Satellite Dataset Source
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onSelectDataset('levir_cd')}
            className={`px-2.5 py-2 rounded text-[11px] font-medium border flex flex-col items-center justify-center gap-1 transition-all ${
              selectedDatasetId === 'levir_cd'
                ? 'bg-[#FF8617]/15 border-[#FF8617] text-[#FF8617] shadow-sm'
                : 'bg-[#151D26] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>LEVIR-CD</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDataset('oscd')}
            className={`px-2.5 py-2 rounded text-[11px] font-medium border flex flex-col items-center justify-center gap-1 transition-all ${
              selectedDatasetId === 'oscd'
                ? 'bg-[#06B6D4]/15 border-[#06B6D4] text-[#06B6D4] shadow-sm'
                : 'bg-[#151D26] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>OSCD (ONERA)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDataset('custom_geotiff')}
            className={`px-2.5 py-2 rounded text-[11px] font-medium border flex flex-col items-center justify-center gap-1 transition-all ${
              selectedDatasetId === 'custom_geotiff'
                ? 'bg-[#FF8617]/15 border-[#FF8617] text-[#FF8617] shadow-sm'
                : 'bg-[#151D26] border-[#34404C] text-[#AAB8C6] hover:text-[#F3F6FA] hover:border-[#465565]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>GeoTIFF Upload</span>
          </button>
        </div>
      </div>

      {/* Benchmark Sample Selection (LEVIR-CD or OSCD) */}
      {selectedDatasetId !== 'custom_geotiff' ? (
        <div className="p-3 rounded bg-[#151D26] border border-[#34404C] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[#AAB8C6] block">
              Benchmark Pair Scenario
            </label>
            {isLoading && (
              <span className="text-[10px] text-[#FF8617] flex items-center gap-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" /> Ingesting...
              </span>
            )}
          </div>

          <select
            value={selectedSampleId}
            onChange={(e) => onSelectSample(e.target.value)}
            disabled={isLoading || samples.length === 0}
            className="w-full bg-[#0B1118] border border-[#34404C] text-[#F3F6FA] text-xs rounded px-2.5 py-2 focus:outline-none focus:border-[#FF8617] transition-colors font-mono"
          >
            {samples.map((s) => (
              <option key={s.sample_id} value={s.sample_id}>
                {s.name} ({s.dimensions})
              </option>
            ))}
          </select>

          <p className="text-[11px] text-[#AAB8C6] leading-relaxed">
            {selectedDatasetId === 'levir_cd'
              ? 'High-resolution Google Earth RGB optical pairs (0.5m GSD). Evaluates structural change detection in pixel space.'
              : 'Sentinel-2 multispectral MSI tiles with UTM georeferencing and spectral band preservation.'}
          </p>
        </div>
      ) : (
        /* Custom GeoTIFF Upload Dropzones */
        <div className="space-y-2.5">
          {/* T1 Before Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-semibold text-[#AAB8C6]">
                1. Before GeoTIFF (T1 Reference Grid)
              </span>
              {customBeforeFile && (
                <span className="text-[10px] text-[#22C55E] flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Staged
                </span>
              )}
            </div>
            <input
              type="file"
              ref={beforeInputRef}
              accept=".tif,.tiff,.png,.jpg,.jpeg"
              onChange={handleBeforeFileChange}
              className="hidden"
            />
            <div
              onClick={() => beforeInputRef.current?.click()}
              className={`p-3 rounded border border-dashed cursor-pointer transition-all flex items-center gap-2.5 ${
                customBeforeFile
                  ? 'bg-[#151D26] border-[#22C55E]/60'
                  : 'bg-[#151D26]/60 border-[#34404C] hover:border-[#FF8617]'
              }`}
            >
              <div className="w-8 h-8 rounded bg-[#0B1118] border border-[#34404C] flex items-center justify-center text-[#3B82F6] shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#F3F6FA] truncate">
                  {customBeforeFile ? customBeforeFile.name : 'Select or Drop Before GeoTIFF (.tif)'}
                </div>
                <div className="text-[10px] text-[#AAB8C6] font-mono">
                  {customBeforeFile ? `${(customBeforeFile.size / 1024).toFixed(1)} KB` : 'EPSG georeferenced raster'}
                </div>
              </div>
            </div>
          </div>

          {/* T2 After Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-semibold text-[#AAB8C6]">
                2. After GeoTIFF (T2 Secondary Grid)
              </span>
              {customAfterFile && (
                <span className="text-[10px] text-[#22C55E] flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Staged
                </span>
              )}
            </div>
            <input
              type="file"
              ref={afterInputRef}
              accept=".tif,.tiff,.png,.jpg,.jpeg"
              onChange={handleAfterFileChange}
              className="hidden"
            />
            <div
              onClick={() => afterInputRef.current?.click()}
              className={`p-3 rounded border border-dashed cursor-pointer transition-all flex items-center gap-2.5 ${
                customAfterFile
                  ? 'bg-[#151D26] border-[#22C55E]/60'
                  : 'bg-[#151D26]/60 border-[#34404C] hover:border-[#FF8617]'
              }`}
            >
              <div className="w-8 h-8 rounded bg-[#0B1118] border border-[#34404C] flex items-center justify-center text-[#FF8617] shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#F3F6FA] truncate">
                  {customAfterFile ? customAfterFile.name : 'Select or Drop After GeoTIFF (.tif)'}
                </div>
                <div className="text-[10px] text-[#AAB8C6] font-mono">
                  {customAfterFile ? `${(customAfterFile.size / 1024).toFixed(1)} KB` : 'EPSG georeferenced raster'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Load Sample GeoTIFF Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onSelectSample('delhi_sector49')}
              disabled={isLoading}
              className="w-full py-1.5 px-3 rounded bg-[#0B1118] border border-[#06B6D4]/40 hover:border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-all text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Load Sample Delhi NCR GeoTIFF (EPSG:32643)</span>
            </button>
          </div>
        </div>
      )}

      {/* Errors or Loading State */}
      {error && (
        <div className="p-2.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-start gap-2 text-xs text-[#EF4444]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-snug">{error}</div>
        </div>
      )}

      {/* Validation Status Pill */}
      {validation && (
        <div className="p-2 rounded bg-[#0B1118] border border-[#34404C] flex items-center justify-between text-xs">
          <span className="text-[#AAB8C6] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Co-registration:</span>
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#22C55E]">
            {validation.aligned ? 'ALIGNED ON T1 GRID' : 'REPROJECTED'}
          </span>
        </div>
      )}
    </div>
  );
};
