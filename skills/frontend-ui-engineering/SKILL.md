---
name: frontend-ui-engineering
description: Xây dựng giao diện người dùng (UI) đạt chuẩn production, chuẩn truy cập (accessible), và chuẩn tương thích (responsive). Sử dụng khi làm hoặc sửa UI và các trang web, tạo component mới, dàn layout, tuân thủ tiêu chuẩn WCAG, quản lý state, hoặc khi bạn muốn giao diện làm ra trông phải ra dáng chuyên nghiệp của một công ty công nghệ xịn chứ đéo phải là mấy cái giao diện AI rẻ tiền.
---

# Kỹ năng: Kỹ thuật Giao diện Frontend (Frontend UI Engineering)

## Tổng quan

Hãy xây dựng những cái giao diện người dùng (UI) chuẩn production: đáp ứng độ tiếp cận (accessible), mượt mà (performant), và bóng bẩy tinh tế (visually polished). Mục tiêu là làm ra một cái UI trông như thể nó được thiết kế bởi một Kỹ sư Thiết kế xịn sò ở một công ty top đầu — chứ đéo phải trông như đống rác AI vừa nôn ra. Điều này có nghĩa là phải tuân thủ gắt gao cái Design System, chuẩn Accessibility, các mẫu tương tác (interaction patterns) có chiều sâu, và tuyệt đối KHÔNG có "thẩm mỹ kiểu AI" (AI aesthetic) chung chung rẻ rách.

## Khi nào cần sử dụng

- Khi xây dựng UI components hoặc các page mới.
- Khi sửa đổi các giao diện người dùng có sẵn.
- Khi làm responsive (tương thích đa màn hình) cho layout.
- Khi gắn thêm tính năng tương tác (interactivity) hoặc quản lý trạng thái (state management).
- Khi fix các lỗi hiển thị (visual) hoặc lỗi trải nghiệm (UX).

## Kiến trúc Component (Component Architecture)

### Cấu trúc File

Nhét chung toàn bộ những thứ liên quan đến một component vào cùng 1 ổ:

```text
src/components/
  TaskList/
    TaskList.tsx          # Code thực thi Component
    TaskList.test.tsx     # Code Test
    TaskList.stories.tsx  # Code Storybook (nếu có xài)
    use-task-list.ts      # Custom hook (nếu cục state quá phức tạp)
    types.ts              # Các types dành riêng cho cái Component này (nếu cần)
```

### Các Mô hình Component (Component Patterns)

**Ưu tiên Lắp ghép (Composition) hơn là Cấu hình (Configuration):**

```tsx
// KHÔN: Dễ dàng lắp ghép (Composable)
<Card>
  <CardHeader>
    <CardTitle>Danh sách Task</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>

// NGU: Nhét tỷ cái cấu hình vào 1 cục (Over-configured)
<Card
  title="Danh sách Task"
  headerVariant="large"
  bodyPadding="md"
  content={<TaskList tasks={tasks} />}
/>
```

**Giữ cho components tập trung vào đúng 1 việc:**

```tsx
// KHÔN: Làm đúng 1 việc
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted' : ''}>{task.title}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
        <TrashIcon />
      </Button>
    </li>
  );
}
```

**Tách bạch việc Lấy Data (Data fetching) ra khỏi việc Hiển thị (Presentation):**

```tsx
// Container: Chuyên lo việc data
export function TaskListContainer() {
  const { tasks, isLoading, error } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Đéo tải được task" retry={refetch} />;
  if (tasks.length === 0) return <EmptyState message="Chưa có cái task nào" />;

  return <TaskList tasks={tasks} />;
}

// Presentation: Chỉ chuyên lo việc vẽ UI (rendering)
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

## Quản lý Trạng thái (State Management)

**Hãy chọn cách nào Ngu Ngốc và Đơn Giản nhất có thể:**

```text
Local state (useState)           → Dành cho mấy cái trạng thái loe ngoe bên trong Component
Lifted state (Kéo lên cha)       → Dùng chung giữa 2-3 thằng anh em (sibling components)
Context                          → Theme, auth, ngôn ngữ (Đọc nhiều, hiếm khi Ghi)
URL state (searchParams)         → Bộ Lọc (Filters), Phân trang (pagination), những cái muốn share link được
Server state (React Query, SWR)  → Data kéo từ Remote về kèm Caching
Global store (Zustand, Redux)    → Mớ bòng bong client state cực phức tạp dùng chung cho cả cái app
```

**Tuyệt đối ĐÉO khoan State xuống sâu quá 3 tầng (prop drilling).** Nếu bạn đang phải truyền props đi xuyên qua cái component đéo xài gì tới nó, hãy nhét nó vào Context hoặc đập mẹ cái cây component tree đó đi mà xây lại.

## Tuân thủ Design System (Design System Adherence)

### Tránh xa cái "Thẩm mỹ kiểu AI" (AI Aesthetic)

Cái đống UI do bọn AI đẻ ra nhìn phát biết ngay. HÃY NÉ TOÀN BỘ NHỮNG THỨ SAU:

| Mặc định của AI (AI Default) | Tại sao nó lại Khắm (Why It Is a Problem) | Chuẩn Chất lượng Production |
|---|---|---|
| Cái lồn gì cũng màu Tím/Indigo | Bọn model toàn tự chọn cái bảng màu "an toàn", khiến cho cái app nào nhìn cũng giống hệt nhau | Hãy xài đúng cái Bảng màu (Color palette) thực sự của project |
| Lạm dụng Gradients | Gradients sinh ra độ nhiễu hiển thị và đá nhau chan chát với hầu hết các Design System xịn | Dùng mảng màu bệt (Flat) hoặc gradients siêu mờ nhạt bám theo Design system |
| Bo tròn TẤT CẢ mọi thứ (rounded-2xl) | Bo tròn tối đa tạo ra cảm giác "thân thiện" nhưng ỉa mẹ lên quy tắc Phân cấp (hierarchy) của góc bo (corner radii) trong Thiết kế thật | Bo góc (border-radius) phải đồng nhất với Design System |
| Hero sections rập khuôn chung chung | Layout đẻ ra từ ba cái template rác rưởi đéo liên quan mẹ gì tới content hay mục đích của user | Hãy dùng Layout đặt Content lên hàng đầu (Content-first) |
| Văn mẫu Lorem ipsum | Text chữ mẫu nó che lấp đi hết mấy cái lỗi layout chí mạng mà chỉ khi có text thật mới lòi ra (độ dài, xuống dòng, tràn chữ) | Dùng chữ mẫu nhưng phải NHƯ THẬT (Realistic placeholder content) |
| Khắp nơi toàn Padding to tổ chảng | Để Padding đều chằn chặn to đùng làm phá nát cái phân cấp thị giác (visual hierarchy) và lãng phí không gian màn hình | Khung tỷ lệ khoảng cách (spacing scale) phải chuẩn và nhất quán |
| Danh sách Card (Stock card grids) | Chia ô đều nhau (Uniform grids) là trò ăn bớt của bọn lười biếng, ỉa mẹ lên mức độ ưu tiên thông tin (information priority) và thói quen quét mắt của người dùng | Bố cục Layout phải bám sát theo Mục Đích (Purpose-driven) |
| Lạm dụng Đổ bóng (Shadow-heavy) | Đổ một đống tầng bóng (Layered shadows) để tạo chiều sâu sẽ cạnh tranh độ nổi bật với content và làm lag mẹ máy của đám low-end devices | Bóng mờ nhạt thôi hoặc ĐÉO CẦN BÓNG, trừ phi Design system bắt ép |

### Khoảng cách và Bố cục (Spacing and Layout)

Sử dụng khung tỷ lệ khoảng cách (spacing scale) chuẩn chỉnh. CẤM TỰ BỊA RA CÁC CON SỐ:

```css
/* Dùng theo scale: mỗi nấc là 0.25rem (hoặc tùy theo cái mà project đang xài) */
/* KHÔN */  padding: 1rem;      /* 16px */
/* KHÔN */  gap: 0.75rem;       /* 12px */
/* NGU */   padding: 13px;      /* Đéo nằm trong bất cứ cái scale nào */
/* NGU */   margin-top: 2.3rem; /* Đéo nằm trong bất cứ cái scale nào */
```

### Chữ nghĩa (Typography)

Tôn trọng cái Phân cấp chữ (Type hierarchy):

```text
h1 → Tiêu đề của Trang (ĐÚNG MỘT cái duy nhất mỗi trang)
h2 → Tiêu đề của Từng phần (Section title)
h3 → Tiêu đề của Từng mảng nhỏ (Subsection title)
body → Text thường (Default text)
small → Text phụ/giải thích (Secondary/helper text)
```

Đéo được nhảy cóc các level của thẻ Heading. Đéo được xài cái style của Heading đắp vào những cái chữ đéo phải là Heading.

### Màu sắc (Color)

- Xài các tokens màu có ý nghĩa (Semantic color tokens): `text-primary`, `bg-surface`, `border-default` — chứ KHÔNG ĐƯỢC CHƠI MÃ MÀU HEX RAW.
- Đảm bảo độ tương phản (contrast) phải đủ sáng (Tỉ lệ 4.5:1 cho text thường, 3:1 cho text to).
- CẤM dùng mỗi Màu Sắc để thông báo thông tin (phải kết hợp thêm icon, chữ text, hoặc họa tiết).

## Tiêu chuẩn Tiếp cận (Accessibility - WCAG 2.1 AA)

Mỗi component đẻ ra đều phải đáp ứng các tiêu chuẩn này:

### Điều hướng bằng Bàn phím (Keyboard Navigation)

```tsx
// MỌI CÁI element tương tác được ĐỀU PHẢI dùng được bằng bàn phím
<button onClick={handleClick}>Click me</button>        // ✓ Bấm phím Tab vào được
<div onClick={handleClick}>Click me</div>               // ✗ Đéo bấm Tab vào được
<div role="button" tabIndex={0} onClick={handleClick}    // ✓ Tạm được nhưng khuyên dùng mẹ thẻ <button>
     onKeyDown={e => {
       if (e.key === 'Enter') handleClick();
       if (e.key === ' ') e.preventDefault();
     }}
     onKeyUp={e => {
       if (e.key === ' ') handleClick();
     }}>
  Click me
</div>
```

### Nhãn ARIA (ARIA Labels)

```tsx
// Gắn nhãn cho mấy cái nút tương tác mà đéo có tí text nào (như Icon)
<button aria-label="Đóng cửa sổ"><XIcon /></button>

// Gắn nhãn cho Form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Hoặc xài aria-label nếu đéo có cái nhãn (label) thật nào
<input aria-label="Tìm task" type="search" />
```

### Quản lý Tiêu điểm (Focus Management)

```tsx
// Lái tiêu điểm (focus) khi nội dung vừa bị thay đổi
function Dialog({ isOpen, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Nhốt tiêu điểm (Trap focus) không cho lọt ra ngoài cái dialog lúc nó đang mở
  return (
    <dialog open={isOpen}>
      <button ref={closeRef} onClick={onClose}>Đóng</button>
      {/* dialog content */}
    </dialog>
  );
}
```

### Các Trạng thái Trống (Empty) và Lỗi (Error) Rõ ràng

```tsx
// Đéo bao giờ được để Màn Hình Trắng
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div role="status" className="text-center py-12">
        <TasksEmptyIcon className="mx-auto h-12 w-12 text-muted" />
        <h3 className="mt-2 text-sm font-medium">Chưa có task nào</h3>
        <p className="mt-1 text-sm text-muted">Bấm mẹ nút tạo task đi để bắt đầu.</p>
        <Button className="mt-4" onClick={onCreateTask}>Tạo Task</Button>
      </div>
    );
  }

  return <ul role="list">...</ul>;
}
```

## Responsive Design (Tương thích Đa màn hình)

Thiết kế màn hình Mobile trước (Mobile first), rồi mới nới dần ra:

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: 1 cột duy nhất */
  sm:grid-cols-2        /* Màn Small: 2 cột */
  lg:grid-cols-3        /* Màn Large: 3 cột */
  gap-4
">
```

Bắt buộc Test ở các điểm gãy (breakpoints) này: 320px, 768px, 1024px, 1440px.

## Loading và Chuyển cảnh (Transitions)

```tsx
// Khung xương load (Skeleton loading) (đéo xài Spinners xoay xoay cho Content nữa)
function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải mớ tasks...">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

// Cập nhật Lạc Quan (Optimistic updates) để tạo Cảm giác Nhanh Phóng Chóng Mặt
function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);

      // Ảo tưởng sức mạnh update UI luôn đéo cần chờ Server
      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      );

      return { previous };
    },
    onError: (_err, _taskId, context) => {
      // Nhỡ Server chửi thì xôi hỏng bỏng không Rollback lại UI
      queryClient.setQueryData(['tasks'], context?.previous);
    },
  });
}
```

## Xem thêm

Để nắm các nguyên tắc Accessibility chi tiết và các tool kiểm tra, mời xem file `references/accessibility-checklist.md`.

## Các lý do Biện minh Thường gặp

| Lời biện minh | Thực tế |
|---|---|
| "Accessibility có thì tốt đéo có cũng chả sao (nice-to-have)" | Có cái lồn, nhiều nước nó có luật bắt buộc đấy con trai ạ, và nó cũng là thước đo chuẩn mực Kỹ thuật nữa. |
| "Cứ code đi tí làm responsive sau" | Đắp responsive sau (Retrofitting) nhọc gấp 3 lần so với việc xây mẹ nó từ đầu. |
| "Design chốt đéo đâu, code chay thôi khỏi cần styling" | Lấy mẹ đống style mặc định của Design System ra mà dùng. Đưa cục UI mộc chó gặm cho mấy sếp review là ăn chửi đấy. |
| "Chỉ là Prototype vớ vẩn thôi mà" | Mấy cái Prototype đẻ ra xong toàn bị quăng thẳng lên Production. Xây cái móng cho nó đàng hoàng đi. |
| "Thôi cứ thẩm mỹ kiểu AI cũng được có sao đâu" | Nó là dấu hiệu của rác rưởi (low quality). Bám ngay vào cái Design system của project từ ngày 1 đi. |

## Các Dấu hiệu Cảnh báo (Red Flags)

- Cục Component nhồi nhét tận 200 dòng (Băm nhỏ mẹ nó ra).
- Chơi kiểu CSS nội tuyến (Inline styles) hoặc bịa đại ra mấy con số pixels vớ vẩn.
- Quên cmn mất đéo làm màn hình Lỗi, màn hình Đang load, hay màn hình Trống (Empty).
- Đéo thèm Test cái tính năng Bấm phím Tab (keyboard navigation).
- Xài mỗi cái Màu sắc để mô tả trạng thái (xanh/đỏ mà đéo có chữ hay icon gì sất).
- Cục UI phảng phất mùi "AI aesthetic" (chơi gradient màu Tím rác rưởi, card to chà bá dọng vô mặt, layout công nghiệp).

## Xác minh (Verification)

Sau khi code xong cái cục UI:

- [ ] Render không có hột Console errors nào đỏ lòm.
- [ ] BẤT CỨ cái element nào cũng phải bấm phím Tab chui vào được.
- [ ] Trình đọc màn hình (Screen reader) có thể nhai và phun ra được nội dung với cấu trúc đàng hoàng.
- [ ] Tương thích mọi màn hình (Responsive): co kéo mượt mà ở 320px, 768px, 1024px, 1440px.
- [ ] 3 cái trạng thái: Đang load, Lỗi, và Trống (Empty) đều có chỗ đứng đàng hoàng.
- [ ] Bám rịt lấy cái hệ tư tưởng của Design System (khoảng cách, màu sắc, chữ nghĩa).
- [ ] Dev tools hoặc Axe-core soi vào không gào thét báo lỗi Accessibility nào.
