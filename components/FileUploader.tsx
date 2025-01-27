"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "./Thumbnail";
import { MAX_FILE_SIZE, MAX_FILE_VALUE } from "@/constants";
import { useToast } from "@/hooks/use-toast";

interface Props {
  ownerId: string;
  accountId: string;
  className?: string;
}
const FileUploader = ({ ownerId, accountId, className }: Props) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]); // type of file array

  // handles the file drop event and processes accepted files
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles); // updates the state with the accepted files

    // maps through each accepted file to check its size and handle uploads
    const uploadPromises = acceptedFiles.map(async (file) => {
      // checks if the file exceeds the maximum allowed size
      if (file.size > MAX_FILE_SIZE) {
        // removes the oversized file from the state
        setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));

        // displays a toast notification to inform the user about the size limit
        return toast({
          description: (
            <p className="body-2 text-white">
              <span className="font-semibold">{file.name}</span> is too large.
              Max file size is <span>{MAX_FILE_VALUE} </span> MB
            </p>
          ),
          className: "error-toast",
        });
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // handles the removal of a specific file from the upload list
  const handleRemoveFile = (
    // specifying eventhough the remove button is an image, it is also a mouse event
    e: React.MouseEvent<HTMLImageElement, MouseEvent>,
    fileName: string
  ) => {
    // stops the event from bubbling up to parent elements, preventing unintended behavior when clicking on the file removal icon
    e.stopPropagation();
    // filters out the file to be removed while keeping the rest in the list
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <Button type="button" className={cn("uploader-button", className)}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />
        <p>Upload</p>
      </Button>

      {/* bulk upload so that we know the progress for each file that is being uploaded*/}
      {files.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100">Uploading</h4>
          {files.map((file, index) => {
            const { type, extension } = getFileType(file.name); // to know the type of each uploaded file

            return (
              // do the key like this to make it really unique
              <li
                key={`${file.name}-${index}`}
                className="uploader-preview-item"
              >
                <div className="flex items-center gap-3">
                  {/* thumbnail to have a preview of the file that we are trying to upload */}
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />
                  <div className="preview-item-name">
                    {file.name}

                    <Image
                      src="/assets/icons/file-loader.gif"
                      width={80}
                      height={26}
                      alt="Loader"
                    />
                  </div>
                </div>
                {/* cancel or remove upload for a specific file */}
                <Image
                  src="/assets/icons/remove.svg"
                  alt="Remove"
                  width={24}
                  height={24}
                  onClick={(e) => handleRemoveFile(e, file.name)} // pass the event and the file name
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
