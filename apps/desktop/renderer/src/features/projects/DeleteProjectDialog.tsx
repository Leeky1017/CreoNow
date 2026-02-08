import React from "react";

import { Button, Dialog, Input, Text } from "../../components/primitives";

export interface DeleteProjectDialogProps {
  open: boolean;
  projectName: string;
  documentCount: number;
  submitting?: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

/**
 * DeleteProjectDialog enforces exact-name confirmation before destructive delete.
 *
 * Why: PM-2 requires explicit second confirmation to prevent accidental purge.
 */
export function DeleteProjectDialog(props: DeleteProjectDialogProps): JSX.Element {
  const [typedName, setTypedName] = React.useState("");

  React.useEffect(() => {
    if (props.open) {
      setTypedName("");
    }
  }, [props.open]);

  const canDelete = typedName === props.projectName && !props.submitting;

  const description = `删除项目"${props.projectName}"将永久删除所有文档（${props.documentCount} 篇）、知识图谱数据和版本历史。请输入项目名称确认删除。`;

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="确认删除项目"
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
            disabled={Boolean(props.submitting)}
          >
            取消
          </Button>
          <Button
            data-testid="delete-project-confirm-button"
            type="button"
            variant="danger"
            disabled={!canDelete}
            loading={Boolean(props.submitting)}
            onClick={() => {
              if (!canDelete) {
                return;
              }
              void props.onConfirm();
            }}
          >
            确认删除
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Text size="small" color="muted">
          请输入项目名以确认：
        </Text>
        <Input
          data-testid="delete-project-name-input"
          value={typedName}
          onChange={(event) => setTypedName(event.target.value)}
          placeholder={props.projectName}
          autoFocus
        />
      </div>
    </Dialog>
  );
}
