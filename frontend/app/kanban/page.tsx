import KanbanBoard from "@/components/kanban/KanbanBoard"
import NavHeader from "@/components/NavHeader"

export default function KanbanPage() {
  return (
    <div className="flex h-full flex-col">
      <NavHeader />

      {/* カンバンボード（クライアントコンポーネント） */}
      <KanbanBoard />
    </div>
  )
}
