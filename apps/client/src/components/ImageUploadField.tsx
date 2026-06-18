import { useId, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { Button } from "../ui/Button";
import { EntityPhoto } from "./EntityPhoto";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (value?: string) => void;
  disabled?: boolean;
  helperText?: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

export const ImageUploadField = ({
  value,
  onChange,
  disabled = false,
  helperText,
}: ImageUploadFieldProps) => {
  const intl = useIntl();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const helperTextValue =
    helperText ??
    intl.formatMessage({
      id: "imageupload_helpertext",
      defaultMessage: "JPG, PNG, WEBP, GIF, or SVG. Max 5 MB.",
    });

  const handlePick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        intl.formatMessage({ id: "imageupload_errorinvalidtype", defaultMessage: "File must be an image." }),
      );
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage(
        intl.formatMessage({ id: "imageupload_errortoolarge", defaultMessage: "Image size must be 5 MB or smaller." }),
      );
      return;
    }

    setIsReading(true);
    setErrorMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center gap-4">
        <EntityPhoto
          src={value}
          alt={intl.formatMessage({ id: "imageupload_previewalt", defaultMessage: "Preview photo" })}
          className="h-20 w-20 rounded-2xl border border-slate-200 dark:border-slate-700"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              type="button"
              onClick={handlePick}
              disabled={disabled || isReading}
              leftIcon={<Icon icon="solar:camera-add-linear" className="h-4 w-4" />}
            >
              {value
                ? intl.formatMessage({ id: "imageupload_replacebutton", defaultMessage: "Replace Photo" })
                : intl.formatMessage({ id: "imageupload_choosebutton", defaultMessage: "Choose Photo" })}
            </Button>
            {value && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => onChange(undefined)}
                disabled={disabled || isReading}
              >
                {intl.formatMessage({ id: "imageupload_removebutton", defaultMessage: "Remove Photo" })}
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">{helperTextValue}</p>
          {errorMessage && <p className="text-xs text-state-danger">{errorMessage}</p>}
        </div>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
