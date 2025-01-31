// dynamic page route

import Card from "@/components/Card";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import { Models } from "node-appwrite";
import React from "react";

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || ""; // getting the type of the params
  const searchText = ((await searchParams)?.query as string) || ""; // getting the search text from the params
  const sort = ((await searchParams)?.sort as string) || ""; // getting the sort from the params

  const types = getFileTypesParams(type) as FileType[];

  const files = await getFiles({ types, searchText, sort });

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">{type}</h1>

        <div className="total-size-section">
          <p className="body-1">
            Space Occupied:{" "}
            <span className="h5">
              {convertFileSize(
                files.documents.reduce(
                  (total: number, file: Models.Document) => total + file.size,
                  0
                )
              )}
            </span>
          </p>
          <div className="sort-container">
            <p className="body-1 hidden sm:block text-light-200"> Sort by:</p>
            <Sort />
          </div>
        </div>
      </section>
      {/* Render the files */}
      {/* .total and not .length because the file is in the Documents array */}
      {files.total > 0 ? (
        <section className="file-list">
          {files.documents.map((file: Models.Document) => (
            <Card key={file.$id} file={file} />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};

export default Page;
