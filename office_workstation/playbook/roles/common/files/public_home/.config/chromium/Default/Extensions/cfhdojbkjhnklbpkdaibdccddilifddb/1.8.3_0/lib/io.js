/*
 * This file is part of Adblock Plus <http://adblockplus.org/>,
 * Copyright (C) 2006-2014 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

//
// This file has been generated automatically, relevant repositories:
// * https://hg.adblockplus.org/jshydra/
//

require.scopes["io"] = (function()
{
  var exports = {};
  var IO = exports.IO = {
    _getFileEntry: function(file, create, successCallback, errorCallback)
    {
      if (file instanceof FakeFile)
      {
        file = file.path;
      }
      else if ("spec" in file)
      {
        file = file.spec;
      }
      file = file.replace(/^.*[\/\\]/, "");
      (window.requestFileSystem || window.webkitRequestFileSystem)(window.PERSISTENT, 1024 * 1024 * 1024, function(fs)
      {
        fs.root.getFile(file,
        {
          create: create
        }, function(fileEntry)
        {
          successCallback(fs, fileEntry);
        }, errorCallback);
      }, errorCallback);
    },
    lineBreak: "\n",
    resolveFilePath: function(path)
    {
      return new FakeFile(path);
    },
    readFromFile: function(file, listener, callback, timeLineID)
    {
      if (typeof file == "string")
      {
        var Utils = require("utils").Utils;
        Utils.runAsync(function()
        {
          var lines = file.split(/[\r\n]+/);
          for (var i = 0; i < lines.length; i++)
          {
            listener.process(lines[i]);
          }
          listener.process(null);
          callback(null);
        }.bind(this));
        return;
      }
      this._getFileEntry(file, false, function(fs, fileEntry)
      {
        fileEntry.file(function(file)
        {
          if (file.size == 0)
          {
            callback("File is empty");
            return;
          }
          var reader = new FileReader();
          reader.onloadend = function()
          {
            if (reader.error)
            {
              callback(reader.error);
            }
            else
            {
              var lines = reader.result.split(/[\r\n]+/);
              for (var i = 0; i < lines.length; i++)
              {
                listener.process(lines[i]);
              }
              listener.process(null);
              callback(null);
            }
          };
          reader.readAsText(file);
        }, callback);
      }, callback);
    },
    writeToFile: function(file, data, callback, timeLineID)
    {
      this._getFileEntry(file, true, function(fs, fileEntry)
      {
        fileEntry.createWriter(function(writer)
        {
          var executeWriteOperation = function(op, nextOperation)
          {
            writer.onwriteend = function()
            {
              if (writer.error)
              {
                callback(writer.error);
              }
              else
              {
                nextOperation();
              }
            }.bind(this);
            op();
          }.bind(this);
          var blob;
          try
          {
            blob = new Blob([data.join(this.lineBreak) + this.lineBreak],
            {
              type: "text/plain"
            });
          }
          catch (e)
          {
            if (!(e instanceof TypeError))
            {
              throw e;
            }
            var builder = new window.BlobBuilder || window.WebKitBlobBuilder();
            builder.append(data.join(this.lineBreak) + this.lineBreak);
            blob = builder.getBlob("text/plain");
          }
          executeWriteOperation(writer.write.bind(writer, blob), function()
          {
            executeWriteOperation(writer.truncate.bind(writer, writer.position), callback.bind(null, null));
          });
        }.bind(this), callback);
      }.bind(this), callback);
    },
    copyFile: function(fromFile, toFile, callback)
    {
      var data = [];
      this.readFromFile(fromFile,
      {
        process: function(line)
        {
          if (line !== null)
          {
            data.push(line);
          }
        }
      }, function(e)
      {
        if (e)
        {
          callback(e);
        }
        else
        {
          this.writeToFile(toFile, data, callback);
        }
      }.bind(this));
    },
    renameFile: function(fromFile, newName, callback)
    {
      this._getFileEntry(fromFile, false, function(fs, fileEntry)
      {
        fileEntry.moveTo(fs.root, newName, function()
        {
          callback(null);
        }, callback);
      }, callback);
    },
    removeFile: function(file, callback)
    {
      this._getFileEntry(file, false, function(fs, fileEntry)
      {
        fileEntry.remove(function()
        {
          callback(null);
        }, callback);
      }, callback);
    },
    statFile: function(file, callback)
    {
      if (typeof file == "string")
      {
        var Utils = require("utils").Utils;
        Utils.runAsync(callback.bind(null, null,
        {
          exists: true,
          isDirectory: false,
          isFile: true,
          lastModified: 0
        }));
        return;
      }
      require("utils").Utils.runAsync(function()
      {
        this._getFileEntry(file, false, function(fs, fileEntry)
        {
          fileEntry.getMetadata(function(metadata)
          {
            callback(null,
            {
              exists: true,
              isDirectory: fileEntry.isDirectory,
              isFile: fileEntry.isFile,
              lastModified: metadata.modificationTime.getTime()
            });
          }, callback);
        }, callback);
      }.bind(this));
    }
  };
  return exports;
})();
