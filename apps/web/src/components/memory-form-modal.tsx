"use client";

import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  toast,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { createMemorySchema, type MemoryDto } from "@rm/shared";
import { useState } from "react";
import { LockIcon, UsersIcon } from "@/components/icons";
import { ApiError, apiFetch } from "@/lib/api";

type FieldErrors = Partial<Record<"title" | "body" | "eventDate" | "visibility" | "tags", string>>;

const messages: Record<keyof FieldErrors, string> = {
  title: "Đặt tiêu đề từ 1 đến 200 ký tự.",
  body: "Câu chuyện tối đa 10.000 ký tự.",
  eventDate: "Chọn ngày diễn ra kỷ niệm.",
  visibility: "Chọn ai được xem kỷ niệm này.",
  tags: "Tối đa 10 nhãn, mỗi nhãn tối đa 30 ký tự.",
};

export function MemoryFormModal({
  spaceId,
  state,
  onCreated,
}: {
  spaceId: string;
  state: UseOverlayStateReturn;
  onCreated: (memory: MemoryDto) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const parsed = createMemorySchema.safeParse({
      title: form.get("title"),
      body: form.get("body") ?? "",
      eventDate: form.get("eventDate"),
      visibility: form.get("visibility") ?? undefined,
      tags,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key in messages) next[key] = messages[key];
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const memory = await apiFetch<MemoryDto>(`/v1/spaces/${spaceId}/memories`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      toast.success("Đã lưu kỷ niệm", { description: "AI sẽ đọc kỷ niệm này trong giây lát." });
      state.close();
      onCreated(memory);
    } catch (err) {
      toast.danger(err instanceof ApiError ? err.message : "Không lưu được kỷ niệm. Thử lại sau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="Đóng" />
            <Modal.Header>
              <Modal.Heading className="font-serif text-2xl">Thêm kỷ niệm</Modal.Heading>
            </Modal.Header>
            <Form id="memory-form" onSubmit={onSubmit} validationBehavior="aria">
              <Modal.Body className="flex flex-col gap-5">
                <TextField name="title" isInvalid={!!errors.title}>
                  <Label>Tiêu đề</Label>
                  <Input placeholder="Chuyến Đà Lạt đầu tiên" />
                  <FieldError>{errors.title}</FieldError>
                </TextField>

                <TextField name="eventDate" type="date" isInvalid={!!errors.eventDate}>
                  <Label>Ngày diễn ra</Label>
                  <Input type="date" />
                  <FieldError>{errors.eventDate}</FieldError>
                </TextField>

                <TextField name="body" isInvalid={!!errors.body}>
                  <Label>Câu chuyện</Label>
                  <TextArea rows={5} placeholder="Hôm đó hai đứa…" />
                  <FieldError>{errors.body}</FieldError>
                </TextField>

                <TextField name="tags" isInvalid={!!errors.tags}>
                  <Label>Nhãn</Label>
                  <Input placeholder="du lịch, đà lạt" />
                  <Description>Cách nhau bằng dấu phẩy. Không bắt buộc.</Description>
                  <FieldError>{errors.tags}</FieldError>
                </TextField>

                <RadioGroup name="visibility" isInvalid={!!errors.visibility}>
                  <Label>Ai được xem?</Label>
                  <Radio value="shared">
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <span className="inline-flex items-center gap-1.5">
                        <UsersIcon width={14} height={14} />
                        Cả hai người
                      </span>
                    </Radio.Content>
                    <Description>Người ấy thấy và AI dùng khi cả hai cùng hỏi.</Description>
                  </Radio>
                  <Radio value="private">
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <span className="inline-flex items-center gap-1.5">
                        <LockIcon width={14} height={14} />
                        Chỉ mình tôi
                      </span>
                    </Radio.Content>
                    <Description>Chỉ bạn thấy. AI chỉ dùng khi chính bạn hỏi.</Description>
                  </Radio>
                  <FieldError>{errors.visibility}</FieldError>
                </RadioGroup>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" slot="close">
                  Huỷ
                </Button>
                <Button type="submit" isPending={saving}>
                  Lưu kỷ niệm
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
