import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Clipboard,
  Eye,
  ImagePlus,
  Loader2,
  Maximize2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

type GenerationResult = {
  success?: boolean;
  taskId?: string;
  taskStatus?: string;
  pollAttempt?: number;
  imageUrl?: string;
  imageDataUrl?: string | null;
  fileName?: string;
  mimeType?: string;
  request?: unknown;
  submitResponse?: unknown;
  taskResponse?: unknown;
  completedAt?: string;
};

type FormState = {
  webhookUrl: string;
  prompt: string;
  referenceImageUrl: string;
  model: string;
  size: string;
  resolution: string;
  quality: string;
  background: string;
  moderation: string;
  outputFormat: string;
  n: number;
};

const defaultWebhookUrl =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'https://englocal001.app.n8n.cloud/webhook/apimart-gpt-image-2-image-to-image-web-ui';

const initialState: FormState = {
  webhookUrl: localStorage.getItem('apimart-webhook-url') || defaultWebhookUrl,
  prompt: '基于参考图生成一张更精致、更自然的商业级图像，保留主体特征，提升光线、构图与材质细节。',
  referenceImageUrl: '',
  model: 'gpt-image-2-official',
  size: '9:16',
  resolution: '2k',
  quality: 'medium',
  background: 'auto',
  moderation: 'auto',
  outputFormat: 'png',
  n: 1,
};

const sizeOptions = ['auto', '1:1', '2:3', '3:4', '4:5', '9:16', '16:9'];
const resolutionOptions = ['1k', '2k', '4k'];
const qualityOptions = ['auto', 'low', 'medium', 'high'];
const backgroundOptions = ['auto', 'transparent', 'opaque'];
const moderationOptions = ['auto', 'low'];
const outputOptions = ['png', 'jpeg', 'webp'];

const compactUnknown = (value: unknown): unknown => {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) return '[base64 image omitted]';
    if (value.length > 600) return `${value.slice(0, 280)}... [truncated ${value.length} chars]`;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(compactUnknown);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, compactUnknown(nested)]),
    );
  }

  return value;
};

const buildCoreResponse = (data: GenerationResult) => ({
  success: data.success,
  taskId: data.taskId,
  taskStatus: data.taskStatus,
  pollAttempt: data.pollAttempt,
  imageUrl: data.imageUrl,
  fileName: data.fileName,
  mimeType: data.mimeType,
  completedAt: data.completedAt,
  request: compactUnknown(data.request),
  submitResponse: compactUnknown(data.submitResponse),
  taskResponse: compactUnknown(data.taskResponse),
});

function App() {
  const [form, setForm] = useState<FormState>(initialState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'reference' | 'result' | null>(null);

  const resultImage = result?.imageUrl || result?.imageDataUrl || '';
  const referencePreview = imagePreview || form.referenceImageUrl.trim();
  const canSubmit = form.prompt.trim().length > 0 && (imageFile || form.referenceImageUrl.trim().length > 0);

  const requestSummary = useMemo(
    () => [
      { label: '模型', value: form.model },
      { label: '比例', value: form.size },
      { label: '分辨率', value: form.resolution },
      { label: '质量', value: form.quality },
      { label: '背景', value: form.background },
      { label: '审查', value: form.moderation },
      { label: '格式', value: form.outputFormat },
      { label: '数量', value: String(form.n) },
    ],
    [form],
  );

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'webhookUrl') {
      localStorage.setItem('apimart-webhook-url', String(value));
    }
  };

  const pickFile = (file: File | null) => {
    setImageFile(file);
    setError('');
    if (!file) {
      setImagePreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submitGeneration = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setResult(null);
    setRawResponse('');

    const payload = new FormData();
    payload.append('prompt', form.prompt.trim());
    payload.append('reference_image_url', form.referenceImageUrl.trim());
    payload.append('model', form.model);
    payload.append('size', form.size);
    payload.append('resolution', form.resolution);
    payload.append('quality', form.quality);
    payload.append('background', form.background);
    payload.append('moderation', form.moderation);
    payload.append('output_format', form.outputFormat);
    payload.append('n', String(form.n));

    if (imageFile) {
      payload.append('reference_image', imageFile);
    }

    try {
      const response = await fetch(form.webhookUrl.trim(), {
        method: 'POST',
        body: payload,
      });
      const text = await response.text();
      let data: GenerationResult;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || `n8n 返回了非 JSON 响应，HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(JSON.stringify(data, null, 2));
      }

      setResult(data);
      setRawResponse(JSON.stringify(buildCoreResponse(data), null, 2));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '提交失败，请检查 webhook、凭证或 n8n 执行日志。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTaskId = async () => {
    if (result?.taskId) {
      await navigator.clipboard.writeText(result.taskId);
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const anchor = document.createElement('a');
    anchor.href = resultImage;
    anchor.download = result?.fileName || 'apimart-gpt-image-2-official.png';
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <main className="app-shell">
      <section className="workspace-header">
        <div>
          <div className="eyebrow">
            <Sparkles size={16} />
            APIMart GPT-Image-2 Official
          </div>
          <h1>Image-to-Image Web UI</h1>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          n8n production webhook
        </div>
      </section>

      <section className="workspace-grid">
        <form className="control-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="panel-section">
            <label htmlFor="webhookUrl">n8n Webhook URL</label>
            <input
              id="webhookUrl"
              value={form.webhookUrl}
              onChange={(event) => updateForm('webhookUrl', event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="panel-section">
            <label htmlFor="prompt">提示词</label>
            <textarea
              id="prompt"
              value={form.prompt}
              onChange={(event) => updateForm('prompt', event.target.value)}
              rows={6}
            />
          </div>

          <div className="panel-section">
            <div className="section-title">
              <ImagePlus size={18} />
              参考图
            </div>
            <label className="drop-zone" htmlFor="referenceImage">
              {imagePreview ? (
                <img src={imagePreview} alt="参考图预览" />
              ) : (
                <span>
                  <Upload size={22} />
                  上传本地图片
                </span>
              )}
              <input
                id="referenceImage"
                type="file"
                accept="image/*"
                onChange={(event) => pickFile(event.target.files?.[0] || null)}
              />
            </label>
            {imageFile && (
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setPreviewMode('reference')}>
                  <Eye size={16} />
                  预览参考图
                </button>
                <button className="ghost-button" type="button" onClick={() => pickFile(null)}>
                  <X size={16} />
                  移除上传图片
                </button>
              </div>
            )}
            <input
              aria-label="参考图片 URL"
              placeholder="或填写公网图片 URL"
              value={form.referenceImageUrl}
              onChange={(event) => updateForm('referenceImageUrl', event.target.value)}
            />
            {referencePreview && !imageFile && (
              <button className="ghost-button" type="button" onClick={() => setPreviewMode('reference')}>
                <Eye size={16} />
                预览参考图
              </button>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">
              <SlidersHorizontal size={18} />
              参数
            </div>
            <div className="param-grid">
              <SelectField label="模型" value={form.model} onChange={(value) => updateForm('model', value)} options={[form.model]} />
              <SelectField label="画面比例" value={form.size} onChange={(value) => updateForm('size', value)} options={sizeOptions} />
              <SelectField label="分辨率" value={form.resolution} onChange={(value) => updateForm('resolution', value)} options={resolutionOptions} />
              <SelectField label="质量" value={form.quality} onChange={(value) => updateForm('quality', value)} options={qualityOptions} />
              <SelectField label="背景" value={form.background} onChange={(value) => updateForm('background', value)} options={backgroundOptions} />
              <SelectField label="审查" value={form.moderation} onChange={(value) => updateForm('moderation', value)} options={moderationOptions} />
              <SelectField label="输出格式" value={form.outputFormat} onChange={(value) => updateForm('outputFormat', value)} options={outputOptions} />
              <label className="field-block">
                数量
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={form.n}
                  onChange={(event) => updateForm('n', Number(event.target.value))}
                />
              </label>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" type="button" disabled={!canSubmit || isSubmitting} onClick={submitGeneration}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            {isSubmitting ? '正在等待 n8n 轮询结果' : '生成图片'}
          </button>
        </form>

        <section className="result-panel">
          <div className="preview-stage">
            {resultImage ? (
              <img src={resultImage} alt="生成结果" />
            ) : (
              <div className="empty-preview">
                <Sparkles size={32} />
                <span>{isSubmitting ? 'APIMart 正在生成，n8n 会返回最终结果' : '生成结果会显示在这里'}</span>
              </div>
            )}
          </div>

          <div className="result-toolbar">
            <div>
              <div className="small-label">Task ID</div>
              <div className="task-line" title={result?.taskId || undefined}>
                <span>{result?.taskId || '尚未生成'}</span>
                {result?.taskId && (
                  <button className="icon-button" type="button" onClick={copyTaskId} aria-label="复制 task id">
                    <Clipboard size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="button-row">
              <button className="secondary-button" type="button" disabled={!resultImage} onClick={() => setPreviewMode('result')}>
                <Maximize2 size={17} />
                预览
              </button>
              <button className="secondary-button" type="button" disabled={!resultImage} onClick={downloadImage}>
                <ArrowDownToLine size={17} />
                下载
              </button>
            </div>
          </div>

          <div className="metadata-row">
            {requestSummary.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {result && (
            <div className="success-box">
              <CheckCircle2 size={18} />
              完成：状态 {result.taskStatus || 'success'}，轮询 {result.pollAttempt ?? '-'} 次
            </div>
          )}

          <div className="raw-panel">
            <div className="raw-title">核心响应</div>
            <pre>{rawResponse || 'n8n 返回的核心 JSON 会显示在这里。'}</pre>
          </div>
        </section>
      </section>

      {previewMode && (
        <div className="preview-modal" role="dialog" aria-modal="true" aria-label="图片预览">
          <button className="modal-backdrop" type="button" aria-label="关闭预览" onClick={() => setPreviewMode(null)} />
          <div className="modal-surface">
            <div className="modal-header">
              <strong>{previewMode === 'result' ? '生成图预览' : '参考图预览'}</strong>
              <button className="icon-button" type="button" onClick={() => setPreviewMode(null)} aria-label="关闭预览">
                <X size={18} />
              </button>
            </div>
            <div className="modal-image-frame">
              {(previewMode === 'result' ? resultImage : referencePreview) ? (
                <img src={previewMode === 'result' ? resultImage : referencePreview} alt="图片预览" />
              ) : (
                <div className="empty-preview">
                  <Sparkles size={28} />
                  <span>暂无可预览图片</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="field-block">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default App;
