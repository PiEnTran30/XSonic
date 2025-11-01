"use client";

import { useState } from "react";

interface ToolParametersProps {
  toolId: string;
  onParametersChange: (params: any) => void;
}

export function ToolParameters({ toolId, onParametersChange }: ToolParametersProps) {
  const [params, setParams] = useState<any>({});

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParametersChange(newParams);
  };

  // Render different parameters based on tool
  switch (toolId) {
    case "audio-cut-join":
      return (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="font-semibold text-lg">Tùy chọn cắt/ghép</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Thao tác</label>
            <select
              value={params.operation || "cut"}
              onChange={(e) => updateParam("operation", e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            >
              <option value="cut">Cắt audio</option>
              <option value="join">Ghép audio</option>
            </select>
          </div>

          {params.operation === "cut" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Thời gian bắt đầu (giây)
                </label>
                <input
                  type="number"
                  min="0"
                  value={params.startTime || 0}
                  onChange={(e) => updateParam("startTime", parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Thời lượng (giây)
                </label>
                <input
                  type="number"
                  min="1"
                  value={params.duration || 30}
                  onChange={(e) => updateParam("duration", parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
            </>
          )}
        </div>
      );

    case "volume-normalize":
      return (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="font-semibold text-lg">Tùy chọn âm lượng</h3>
          
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={params.normalize || false}
                onChange={(e) => updateParam("normalize", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Chuẩn hóa âm lượng (Normalize)</span>
            </label>
          </div>

          {!params.normalize && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Mức âm lượng: {params.volume || 1.0}x
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={params.volume || 1.0}
                onChange={(e) => updateParam("volume", parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0x (Tắt)</span>
                <span>1x (Gốc)</span>
                <span>2x (Gấp đôi)</span>
              </div>
            </div>
          )}
        </div>
      );

    case "pitch-tempo":
      return (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="font-semibold text-lg">Tùy chọn Pitch & Tempo</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Pitch (Cao độ): {params.pitch || 0} semitones
            </label>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={params.pitch || 0}
              onChange={(e) => updateParam("pitch", parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-12 (Thấp hơn 1 quãng 8)</span>
              <span>0 (Gốc)</span>
              <span>+12 (Cao hơn 1 quãng 8)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Tempo (Tốc độ): {params.tempo || 1.0}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={params.tempo || 1.0}
              onChange={(e) => updateParam("tempo", parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.5x (Chậm)</span>
              <span>1x (Gốc)</span>
              <span>2x (Nhanh)</span>
            </div>
          </div>
        </div>
      );

    case "video-downloader":
      return (
        <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="font-semibold text-lg">Tùy chọn tải video</h3>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              URL Video
              <span className="ml-2 text-xs text-blue-400">
                (Hỗ trợ: YouTube, TikTok, Facebook, Instagram, Twitter)
              </span>
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=... hoặc https://www.tiktok.com/..."
              value={params.url || ""}
              onChange={(e) => updateParam("url", e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Chất lượng</label>
            <select
              value={params.quality || "highest"}
              onChange={(e) => updateParam("quality", e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            >
              <option value="highest">Cao nhất</option>
              <option value="lowest">Thấp nhất</option>
              <option value="audio">Chỉ audio</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Định dạng</label>
            <select
              value={params.format || "mp4"}
              onChange={(e) => updateParam("format", e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            >
              <option value="mp4">MP4 (Video)</option>
              <option value="mp3">MP3 (Audio)</option>
            </select>
          </div>

          {!params.url && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ Vui lòng nhập URL video
              </p>
            </div>
          )}

          {params.url && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                ✓ Sẵn sàng tải video
              </p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-sm text-gray-400">
            Tool này không có tùy chọn bổ sung
          </p>
        </div>
      );
  }
}

