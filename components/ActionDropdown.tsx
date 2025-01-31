"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { Models } from "node-appwrite";
import { actionsDropdownItems } from "@/constants";
import Link from "next/link";
import { constructDownloadUrl } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import {
  deleteFile,
  renameFile,
  updateFileUsers,
} from "@/lib/actions/file.actions";
import { FileDetails, ShareInput } from "./ActionsModalContent";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserByEmail } from "@/lib/actions/user.actions";

const ActionDropdown = ({ file }: { file: Models.Document }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(file.name.replace(`.${file.extension}`, "")); // remove extension from name
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const path = usePathname();
  const [currentUser, setCurrentUser] = useState<Models.Document | null>(null);

  // get current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // sync name state with file prop changes
  useEffect(() => {
    setName(file.name.replace(`.${file.extension}`, "")); // remove extension from name
  }, [file.name, file.extension]);

  // close all modals (cancel button is clicked)
  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(file.name.replace(`.${file.extension}`, "")); // remove extension from name
    setError("");
  };

  // handle action (the rename, delete, share button is clicked)
  const handleAction = async () => {
    if (!action) return;

    setIsLoading(true);
    setError("");
    let success = false;

    const actions = {
      rename: () =>
        renameFile({ fileId: file.$id, name, extension: file.extension, path }),
      share: async () => {
        // only owner can share
        if (currentUser?.$id !== file.owner.$id) {
          setError("Only the owner can share this file");
          return false;
        }

        // validate emails
        for (const email of emails) {
          // check if email exists
          const user = await getUserByEmail(email);
          if (!user) {
            setError(`User with email ${email} does not exist`);
            return false;
          }

          // check if email is already in the list
          if (file.users.includes(email)) {
            setError(`User ${email} already has access to this file`);
            return false;
          }
        }

        // combine existing users with new ones
        const updatedEmails = [...new Set([...file.users, ...emails])];
        return updateFileUsers({
          fileId: file.$id,
          emails: updatedEmails,
          path,
        });
      },
      delete: () =>
        deleteFile({ fileId: file.$id, path, bucketFileId: file.bucketFileId }),
    };

    success = await actions[action.value as keyof typeof actions]();

    if (success) {
      // only close modal for non-share actions
      if (action.value !== "share") {
        closeAllModals();
      } else {
        // clear emails input on successful share
        setEmails([]);
        toast({
          description: "File shared successfully",
          className: "success-toast",
        });
      }
    }

    setIsLoading(false);
  };

  const handleRemoveUser = async (email: string) => {
    // only owner can remove users
    if (currentUser?.$id !== file.owner.$id) {
      setError("Only the owner can remove users");
      return;
    }

    const updatedEmails = file.users.filter((e: string) => e !== email);

    const success = await updateFileUsers({
      fileId: file.$id,
      emails: updatedEmails,
      path,
    });

    if (success) {
      toast({
        description: `Removed ${email} from shared users`,
        className: "success-toast",
      });
    }
  };

  // render action label
  const renderDialogContent = () => {
    if (!action) return null;

    const { value, label } = action;
    return (
      <DialogContent className="shad-dialog-button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            {label}
          </DialogTitle>
          {value === "rename" && (
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {value === "details" && <FileDetails file={file} />}
          {value === "share" && (
            <>
              <ShareInput
                file={file}
                onInputChange={setEmails}
                onRemove={handleRemoveUser}
                isOwner={currentUser?.$id === file.owner.$id}
              />
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </>
          )}
          {value === "delete" && (
            <p className="delete-confirmation">
              Are you sure you want to delete{" "}
              <span className="delete-file-name"> {file.name}</span>?
            </p>
          )}
        </DialogHeader>
        {["rename", "delete", "share"].includes(value) && (
          <DialogFooter className="flex flex-col gap-3 md:flex-row">
            <Button onClick={closeAllModals} className="modal-cancel-button">
              Cancel
            </Button>
            <Button
              disabled={isLoading}
              onClick={handleAction}
              className="modal-submit-button"
            >
              <p className="capitalize">{value}</p>
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="animate-spin"
                />
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger className="shad-no-focus">
          <Image
            src="/assets/icons/dots.svg"
            alt="dots"
            width={34}
            height={34}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="max-w-[200px] truncate">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actionsDropdownItems.map((actionItem) => (
            <DropdownMenuItem
              key={actionItem.value}
              className="shad-dropdown-item"
              onClick={() => {
                setAction(actionItem);
                if (
                  ["rename", "share", "delete", "details"].includes(
                    actionItem.value
                  )
                ) {
                  setIsModalOpen(true); // if rename,share,delete,or details is chosen, we will open another modal like a rename modal,a share modal and so on..
                }
              }}
            >
              {/* if the actionItem value is "download", we create a Link component to download the file */}
              {actionItem.value === "download" ? (
                <Link
                  href={constructDownloadUrl(file.bucketFileId)} // constructs the download URL using the file's bucketFileId
                  download={file.name} // sets the filename for the downloaded file
                  className="flex items-center gap-2"
                >
                  <Image
                    src={actionItem.icon}
                    alt={actionItem.label}
                    width={30}
                    height={30}
                  />
                  {actionItem.label}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Image
                    src={actionItem.icon}
                    alt={actionItem.label}
                    width={30}
                    height={30}
                  />
                  {actionItem.label}
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {renderDialogContent()}
    </Dialog>
  );
};

export default ActionDropdown;
