import { Card, Chip, buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { BookIcon, LockIcon, ShieldIcon, SparkIcon, UsersIcon } from "@/components/icons";

const features = [
  {
    icon: BookIcon,
    title: "Lưu kỷ niệm",
    text: "Ghi lại buổi hẹn, chuyến đi, những câu chuyện nhỏ. Mỗi kỷ niệm có ngày, nhãn và chế độ chia sẻ riêng.",
  },
  {
    icon: SparkIcon,
    title: "Hỏi AI về câu chuyện của mình",
    text: "“Lần đầu tụi mình đi Đà Lạt là khi nào?” AI trả lời từ chính kỷ niệm của hai bạn, kèm nguồn để mở lại.",
  },
  {
    icon: UsersIcon,
    title: "Remember When",
    text: "Những ngày này năm xưa tự quay lại, để hai bạn cùng nhớ. Tính năng đang được xây dựng.",
  },
];

const sample = [
  { date: "14/02/2023", title: "Buổi hẹn đầu ở Phở Hòa", body: "Anh làm đổ tương đen, rồi cả hai cười mãi.", shared: true },
  { date: "20/04/2023", title: "Lạc đường ở Đà Lạt", body: "Thuê xe máy, đi lạc gần thác Datanla. Đoạn đường vòng đẹp nhất.", shared: true },
  { date: "01/09/2023", title: "Một điều chưa kể", body: "Chỉ mình bạn đọc được dòng này.", shared: false },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-20 px-4 py-14 sm:px-6 sm:py-20">
      <section className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">Album riêng của hai người</p>
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Nơi giữ lại câu chuyện của hai bạn
          </h1>
          <p className="max-w-[46ch] text-lg text-muted">
            Lưu từng kỷ niệm, chọn điều gì để chia sẻ, và hỏi lại bất cứ lúc nào. Không ai khác đọc được.
          </p>
          <div className="flex flex-wrap gap-3">
            <NextLink href="/login" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Bắt đầu
            </NextLink>
            <a href="#privacy" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              Về quyền riêng tư
            </a>
          </div>
        </div>

        <div aria-label="Ví dụ một timeline" className="relative flex flex-col gap-4 pl-7">
          <span aria-hidden className="absolute bottom-2 left-2 top-2 w-px bg-border" />
          {sample.map((m) => (
            <div key={m.title} className="relative">
              <span aria-hidden className="absolute -left-[1.6rem] top-5 size-2.5 rounded-full bg-accent" />
              <Card className={m.shared ? "" : "border border-dashed border-border bg-surface-secondary"}>
                <Card.Header>
                  <p className="text-xs text-muted">{m.date}</p>
                  <Card.Title className="font-serif text-lg">{m.title}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-muted">{m.body}</p>
                  {!m.shared && (
                    <Chip size="sm" variant="soft" className="mt-3 w-fit">
                      <LockIcon width={12} height={12} />
                      Chỉ mình bạn thấy
                    </Chip>
                  )}
                </Card.Content>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="features" className="flex flex-col gap-8">
        <h2 id="features" className="font-serif text-3xl font-semibold">
          Những gì bạn có thể làm
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} variant="secondary">
              <Card.Header>
                <span className="mb-2 inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
                  <Icon width={18} height={18} />
                </span>
                <Card.Title>{title}</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-muted">{text}</p>
              </Card.Content>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="privacy"
        aria-labelledby="privacy-title"
        className="grid gap-6 rounded-3xl border border-border bg-surface p-8 sm:p-10 md:grid-cols-[auto_1fr]"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
          <ShieldIcon width={24} height={24} />
        </span>
        <div className="flex flex-col gap-4">
          <h2 id="privacy-title" className="font-serif text-2xl font-semibold">
            Riêng tư là mặc định
          </h2>
          <ul className="grid gap-3 text-muted sm:grid-cols-3">
            <li>
              <strong className="block text-foreground">Bạn chọn từng kỷ niệm</strong>
              Kỷ niệm riêng chỉ người viết thấy, kể cả với AI.
            </li>
            <li>
              <strong className="block text-foreground">Không dùng để huấn luyện</strong>
              Câu chuyện của hai bạn không được dùng để train model.
            </li>
            <li>
              <strong className="block text-foreground">Xoá là xoá hẳn</strong>
              Xoá kỷ niệm thì dữ liệu AI liên quan cũng bị xoá theo.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
