'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { PHOTO_ACCEPT } from '@/components/photos/constants/upload';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import type {
  ConditionPhotoEvent,
  UploadConditionPhotosInput,
} from '@/lib/api/queries/condition-photos';
import { todayDateOnly } from '@/lib/format';
import { ConditionPhotoFields } from './condition-photo-fields';
import { FilePreview } from './file-preview';
import { conditionPhotoSchema, type ConditionPhotoValues } from './helpers/condition-photo-schema';

interface UploadConditionPhotosFormProps {
  defaultEvent: ConditionPhotoEvent;
  pending: boolean;
  onSubmit: (input: UploadConditionPhotosInput) => void;
}

// Files + one event/date/note for all of them. No upload state here: the sheet owns the mutation.
export function UploadConditionPhotosForm({
  defaultEvent,
  pending,
  onSubmit,
}: UploadConditionPhotosFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const form = useForm<ConditionPhotoValues>({
    resolver: zodResolver(conditionPhotoSchema),
    defaultValues: { event: defaultEvent, takenOn: todayDateOnly(), note: '' },
  });

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Reset so picking the same files again still fires onChange.
    event.target.value = '';
    if (picked.length === 0) return;
    setFiles(picked);
    setFilesError(null);
  }

  function submit(values: ConditionPhotoValues) {
    if (files.length === 0) return setFilesError('Виберіть фото');
    onSubmit({ files, event: values.event, takenOn: values.takenOn, note: values.note || null });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Files are checked even when the other fields are invalid.
        if (files.length === 0) setFilesError('Виберіть фото');
        void form.handleSubmit(submit)(e);
      }}
    >
      <FieldGroup>
        <Field data-invalid={filesError !== null}>
          <FieldLabel htmlFor="condition-upload-files">Фото</FieldLabel>
          <input
            ref={inputRef}
            id="condition-upload-files"
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            className="hidden"
            onChange={handleFiles}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus />
            {files.length === 0 ? 'Вибрати фото' : `Вибрано: ${files.length} · змінити`}
          </Button>
          {files.length > 0 && (
            <ul className="grid grid-cols-4 gap-1.5">
              {files.map((file, i) => (
                <li key={`${i}:${file.name}:${file.size}`}>
                  <FilePreview file={file} />
                </li>
              ))}
            </ul>
          )}
          {filesError && <FieldError>{filesError}</FieldError>}
        </Field>
        <ConditionPhotoFields control={form.control} idPrefix="condition-upload" />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Завантаження…' : 'Завантажити'}
        </Button>
      </FieldGroup>
    </form>
  );
}
